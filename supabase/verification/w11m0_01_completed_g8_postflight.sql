-- W11 M0-01 Completed G8 DEV authority-retirement postflight.
-- Read-only; run only against Supabase DEV project dpddrqjzqohexixgdqiq.
WITH targets AS (
    SELECT * FROM public._w11_m0_01_completed_g8_targets()
),
target_event AS (
    SELECT
        count(*) AS event_count,
        count(DISTINCT al.user_id) AS actor_count,
        count(DISTINCT al.timestamp) AS timestamp_count,
        min(al.user_id) AS actor_id,
        min(al.timestamp) AS recorded_at
    FROM public.audit_logs al
    WHERE al.details ->> 'batch_id' = 'W11-M0-01-COMPLETED-G8-ABS-RETIREMENT'
),
exact_event AS (
    SELECT count(*) AS exact_event_count
    FROM public.audit_logs al
    JOIN targets t ON al.entity_id = t.abs_id
    CROSS JOIN target_event e
    WHERE al.action = 'status_change'
      AND al.entity_type = 'approved_billing_scope'
      AND al.user_id = e.actor_id
      AND al.timestamp = e.recorded_at
      AND al.details = jsonb_build_object(
          'event_type', 'approved_billing_scope_m0_01_completed_g8_owner_authorized_retirement',
          'batch_id', 'W11-M0-01-COMPLETED-G8-ABS-RETIREMENT',
          'remediation_label', 'OWNER-AUTHORIZED M0-01 G8 DEV TEST-DATA AUTHORITY RETIREMENT',
          'owner_authorization_ref', 'OWNER AUTHORIZATION — CORRECTIVE MIGRATION AND SINGLE RETRY FOR FINAL M0-01 CASE',
          'actor_id', e.actor_id,
          'actor_context', 'Owner-authorized DEV remediation',
          'transaction_timestamp', e.recorded_at,
          'provenance_classification', 'synthetic G8 DEV verification provenance VERIFIED',
          'historical_completed_mechanism', 'UNKNOWN',
          'historical_financial_impact', 'UNKNOWN',
          'commercial_authority', 'SAR 800.00 was commercial authority only',
          'service_id', t.service_id,
          'quotation_id', t.quotation_id,
          'approved_billing_scope_id', t.abs_id,
          'scope_version', 1,
          'reason_code', 'owner_authorized_dev_test_data_retirement',
          'reason_note', 'OWNER-AUTHORIZED M0-01 G8 DEV TEST-DATA AUTHORITY RETIREMENT; historical Completed mechanism UNKNOWN; historical financial impact UNKNOWN; SAR 800.00 was commercial authority only.',
          'recorded_at', e.recorded_at,
          'prior_status', 'approved',
          'prior_voided_at', NULL,
          'prior_superseded_at', NULL,
          'result_status', 'voided',
          'result_voided_at', e.recorded_at,
          'lifecycle_outcome', 'active_approved_authority_retired'
      )
),
target_rows AS (
    SELECT
        t.*,
        s.status AS service_status,
        s.deleted_at AS service_deleted_at,
        s.customer_id AS service_customer_id,
        sl.legacy_status,
        sl.commercial_state,
        sl.payment_state,
        sl.readiness_state,
        sl.execution_state,
        sl.completion_state,
        sl.close_state,
        sl.state_version,
        sl.mapping_version,
        sl.updated_at AS lifecycle_updated_at,
        q.status AS quotation_status,
        q.is_deleted AS quotation_is_deleted,
        q.deleted_at AS quotation_deleted_at,
        q.superseded_at AS quotation_superseded_at,
        q.superseded_by_quotation_id,
        q.grand_total AS quotation_grand_total,
        c.is_deleted AS customer_is_deleted,
        c.deleted_at AS customer_deleted_at,
        a.status AS abs_status,
        a.voided_at,
        a.voided_by,
        a.void_reason,
        a.updated_by AS abs_updated_by,
        a.updated_at AS abs_updated_at,
        a.accepted_grand_total,
        a.scope_version,
        (SELECT count(*) FROM public.approved_billing_scope_items i WHERE i.approved_billing_scope_id = t.abs_id) AS item_count,
        md5(COALESCE((
            SELECT string_agg(to_jsonb(i)::text, E'\n' ORDER BY i.id)
            FROM public.approved_billing_scope_items i
            WHERE i.approved_billing_scope_id = t.abs_id
        ), '')) AS item_digest
    FROM targets t
    LEFT JOIN public.services s ON s.id = t.service_id
    LEFT JOIN public.service_lifecycle_states sl ON sl.service_id = t.service_id
    LEFT JOIN public.customers c ON c.id = t.expected_customer_id
    LEFT JOIN public.quotations q ON q.id = t.quotation_id
    LEFT JOIN public.approved_billing_scopes a ON a.id = t.abs_id
),
prior14_events AS (
    SELECT
        count(*) AS event_count,
        count(DISTINCT al.entity_id) AS abs_count,
        count(DISTINCT al.user_id) AS actor_count,
        count(DISTINCT al.timestamp) AS timestamp_count,
        min(al.user_id) AS actor_id,
        min(al.timestamp) AS recorded_at
    FROM public.audit_logs al
    WHERE al.details ->> 'batch_id' = 'W11-M0-01-14-APPROVED-ABS-RETIREMENT'
),
downstream AS (
    SELECT COALESCE(
        jsonb_agg(jsonb_build_object('relation', relation_name, 'count', link_count) ORDER BY relation_name),
        '[]'::jsonb
    ) AS nonzero_relations
    FROM public._w11_m0_01_completed_g8_downstream_link_counts()
),
metrics AS (
    SELECT
        (SELECT count(*) FROM targets) AS target_count,
        (SELECT count(*) FROM target_rows WHERE abs_status IS NOT NULL) AS abs_row_count,
        (SELECT count(*) FROM target_rows WHERE abs_status = 'voided' AND voided_at IS NOT NULL AND voided_by IS NOT NULL) AS retired_abs_count,
        (SELECT count(*) FROM target_rows WHERE abs_status = 'approved' AND voided_at IS NULL AND voided_by IS NULL) AS active_target_count,
        (SELECT public._w11_m0_01_completed_g8_valid_state_count('voided', actor_id, recorded_at) FROM target_event) AS valid_preserved_state_count,
        (SELECT count(*) FROM target_rows WHERE service_status = 'Completed'
            AND service_deleted_at = (SELECT expected_service_deleted_at FROM targets)
            AND service_customer_id = (SELECT expected_customer_id FROM targets)) AS service_integrity_count,
        (SELECT count(*) FROM target_rows WHERE legacy_status = 'Completed'
            AND commercial_state = 'approved' AND payment_state = 'unassessed'
            AND readiness_state = 'ready' AND execution_state = 'ended'
            AND completion_state = 'confirmed' AND close_state = 'open'
            AND state_version = 1 AND mapping_version = 'w3-v1'
            AND lifecycle_updated_at = (SELECT expected_lifecycle_updated_at FROM targets)) AS lifecycle_integrity_count,
        (SELECT count(*) FROM target_rows WHERE customer_is_deleted IS TRUE AND customer_deleted_at IS NULL) AS customer_integrity_count,
        (SELECT count(*) FROM target_rows WHERE quotation_status = 'approved'
            AND quotation_is_deleted IS FALSE AND quotation_deleted_at IS NULL
            AND quotation_superseded_at IS NULL AND superseded_by_quotation_id IS NULL
            AND quotation_grand_total = 800) AS quotation_integrity_count,
        (SELECT count(*) FROM target_rows WHERE accepted_grand_total = 800
            AND scope_version = 1 AND item_count = 1
            AND item_digest = (SELECT expected_item_digest FROM targets)) AS abs_evidence_integrity_count,
        (SELECT count(*) FROM target_event WHERE event_count = 1 AND actor_count = 1 AND timestamp_count = 1) AS remediation_event_count,
        (SELECT exact_event_count FROM exact_event) AS exact_audit_count,
        (SELECT count(*) FROM public.audit_logs al
            JOIN targets t ON al.entity_type = 'approved_billing_scope' AND al.entity_id = t.abs_id) AS abs_total_audit_count,
        (SELECT count(*) FROM public.invoices i JOIN targets t
            ON i.service_id = t.service_id OR i.approved_quotation_id = t.quotation_id OR i.approved_billing_scope_id = t.abs_id) AS invoice_row_count,
        (SELECT count(*) FROM public.audit_logs al JOIN targets t
            ON al.details ->> 'event_type' = 'invoice.created'
           AND (al.details ->> 'service_id' = t.service_id::text
                OR al.details ->> 'approved_billing_scope_id' = t.abs_id::text)) AS invoice_created_audit_reference_count,
        (SELECT count(*) FROM public._w11_m0_01_completed_g8_downstream_link_counts()) AS nonzero_downstream_path_count,
        (SELECT event_count FROM prior14_events) AS prior14_event_count,
        (SELECT abs_count FROM prior14_events) AS prior14_audit_abs_count,
        (SELECT public._w11_m0_01_valid_state_count('voided', actor_id, recorded_at) FROM prior14_events) AS prior14_retired_state_count
)
SELECT jsonb_build_object(
    'target_count', target_count,
    'abs_row_count', abs_row_count,
    'retired_abs_count', retired_abs_count,
    'active_target_count', active_target_count,
    'valid_preserved_state_count', valid_preserved_state_count,
    'service_integrity_count', service_integrity_count,
    'lifecycle_integrity_count', lifecycle_integrity_count,
    'customer_integrity_count', customer_integrity_count,
    'quotation_integrity_count', quotation_integrity_count,
    'abs_evidence_integrity_count', abs_evidence_integrity_count,
    'remediation_event_count', remediation_event_count,
    'exact_audit_count', exact_audit_count,
    'abs_total_audit_count', abs_total_audit_count,
    'invoice_row_count', invoice_row_count,
    'invoice_created_audit_reference_count', invoice_created_audit_reference_count,
    'expected_downstream_guard_path_count', 90,
    'nonzero_downstream_path_count', nonzero_downstream_path_count,
    'nonzero_downstream_relations', (SELECT nonzero_relations FROM downstream),
    'prior14_event_count', prior14_event_count,
    'prior14_audit_abs_count', prior14_audit_abs_count,
    'prior14_retired_state_count', prior14_retired_state_count,
    'all_checks_pass', target_count = 1 AND abs_row_count = 1 AND retired_abs_count = 1
        AND active_target_count = 0 AND valid_preserved_state_count = 1
        AND service_integrity_count = 1 AND lifecycle_integrity_count = 1
        AND customer_integrity_count = 1 AND quotation_integrity_count = 1
        AND abs_evidence_integrity_count = 1 AND remediation_event_count = 1
        AND exact_audit_count = 1 AND abs_total_audit_count = 2
        AND invoice_row_count = 0 AND invoice_created_audit_reference_count = 0
        AND nonzero_downstream_path_count = 0
        AND prior14_event_count = 14 AND prior14_audit_abs_count = 14
        AND prior14_retired_state_count = 14
) AS completed_g8_postflight
FROM metrics;
