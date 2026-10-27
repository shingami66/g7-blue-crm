-- W11 M0-01 14-case DEV remediation postflight. Read-only; run only on dpddrqjzqohexixgdqiq.
WITH targets AS (
  SELECT * FROM public._w11_m0_01_retirement_targets()
),
target_state AS (
  SELECT
    t.*,
    s.status AS service_status,
    s.deleted_at AS service_deleted_at,
    s.customer_id AS service_customer_id,
    sl.updated_at AS lifecycle_updated_at,
    sl.state_version AS lifecycle_state_version,
    q.service_id AS quotation_service_id,
    q.status AS quotation_status,
    q.is_deleted AS quotation_is_deleted,
    q.deleted_at AS quotation_deleted_at,
    q.superseded_at AS quotation_superseded_at,
    q.superseded_by_quotation_id,
    q.grand_total AS quotation_grand_total,
    a.status AS abs_status,
    a.voided_at,
    a.voided_by,
    a.void_reason,
    a.superseded_at AS abs_superseded_at,
    a.superseded_by_scope_id,
    a.approved_at
  FROM targets t
  LEFT JOIN public.services s ON s.id = t.service_id
  LEFT JOIN public.service_lifecycle_states sl ON sl.service_id = t.service_id
  LEFT JOIN public.quotations q ON q.id = t.quotation_id
  LEFT JOIN public.approved_billing_scopes a ON a.id = t.abs_id
),
batch_events AS (
  SELECT al.*
  FROM public.audit_logs al
  WHERE al.details ->> 'batch_id' = 'W11-M0-01-14-APPROVED-ABS-RETIREMENT'
),
item_evidence AS (
  SELECT
    t.service_id,
    t.abs_id,
    t.expected_item_digest,
    count(i.id)::integer AS item_count,
    md5(COALESCE(string_agg(to_jsonb(i)::text, E'\n' ORDER BY i.id), '')) AS item_digest
  FROM targets t
  LEFT JOIN public.approved_billing_scope_items i ON i.approved_billing_scope_id = t.abs_id
  GROUP BY t.service_id, t.abs_id, t.expected_item_digest
),
excluded_cases AS (
  SELECT
    'completed_sar_800'::text AS kind,
    'c7ca6503-9746-4604-964a-cbe53c118009'::uuid AS service_id,
    '87932c67-cdca-4d6c-bb20-691b59f8961f'::uuid AS quotation_id,
    '513f1e78-5bfa-4ff2-a8a8-6986498d1987'::uuid AS abs_id
  UNION ALL SELECT
    'm0_02_1', '3082b962-009c-4e4f-b5c4-ec2adcb27027'::uuid,
    '30d1f7a6-09a9-4e44-9a0a-f6c15eca5b8f'::uuid, NULL::uuid
  UNION ALL SELECT
    'm0_02_2', 'dc395544-9d24-4869-b6c7-ac020dea959f'::uuid,
    '82dc2e82-19fa-478a-b9a3-6ea6da4a6168'::uuid, NULL::uuid
),
excluded_state AS (
  SELECT
    x.kind,
    s.status AS service_status,
    s.deleted_at AS service_deleted_at,
    q.status AS quotation_status,
    q.is_deleted AS quotation_is_deleted,
    q.deleted_at AS quotation_deleted_at,
    q.superseded_at AS quotation_superseded_at,
    a.id IS NOT NULL AS abs_exists,
    a.status AS abs_status,
    a.voided_at AS abs_voided_at,
    a.superseded_at AS abs_superseded_at,
    (a.status = 'approved' AND a.voided_at IS NULL AND a.superseded_at IS NULL) AS abs_is_active,
    (SELECT count(*) FROM public.approved_billing_scopes ax
     WHERE ax.service_id = x.service_id OR ax.source_quotation_id = x.quotation_id) AS scope_count
  FROM excluded_cases x
  LEFT JOIN public.services s ON s.id = x.service_id
  LEFT JOIN public.quotations q ON q.id = x.quotation_id
  LEFT JOIN public.approved_billing_scopes a ON a.id = x.abs_id
),
exact_audit AS (
  SELECT count(*)::integer AS exact_target_count
  FROM targets t
  JOIN public.approved_billing_scopes a ON a.id = t.abs_id
  WHERE (
    SELECT count(*)
    FROM batch_events al
    WHERE al.action = 'status_change'
      AND al.entity_type = 'approved_billing_scope'
      AND al.entity_id = t.abs_id
      AND al.user_id = a.voided_by
      AND al.timestamp = a.voided_at
      AND al.details = jsonb_build_object(
        'event_type', 'approved_billing_scope_m0_01_owner_authorized_remediation_retired',
        'batch_id', 'W11-M0-01-14-APPROVED-ABS-RETIREMENT',
        'owner_authorization_ref', 'OWNER AUTHORIZATION — M0-01 14-CASE DEV REMEDIATION',
        'actor_context', 'Owner-authorized DEV remediation',
        'service_id', t.service_id,
        'quotation_id', t.quotation_id,
        'approved_billing_scope_id', t.abs_id,
        'scope_version', 1,
        'reason_code', 'other',
        'reason_note', 'OWNER-AUTHORIZED M0-01 REMEDIATION; no historical cause or financial impact is inferred.',
        'recorded_at', a.voided_at,
        'prior_status', 'approved',
        'prior_voided_at', NULL,
        'prior_superseded_at', NULL,
        'result_status', 'voided',
        'result_voided_at', a.voided_at,
        'lifecycle_outcome', 'active_approved_authority_retired'
      )
  ) = 1
    AND a.status = 'voided'
    AND a.voided_at IS NOT NULL
    AND a.voided_by IS NOT NULL
    AND a.void_reason = 'OWNER-AUTHORIZED M0-01 REMEDIATION; no historical cause or financial impact is inferred.'
    AND a.superseded_at IS NULL
    AND a.superseded_by_scope_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.app_users u
      WHERE u.clerk_user_id = a.voided_by AND u.role = 'admin' AND u.is_active IS TRUE
    )
),
downstream AS (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('relation', relation_name, 'count', link_count)
    ORDER BY relation_name) FILTER (WHERE link_count > 0), '[]'::jsonb) AS nonzero_relations
  FROM public._w11_m0_01_downstream_link_counts()
)
SELECT jsonb_build_object(
  'target_count', (SELECT count(*) FROM targets),
  'abs_row_count', (SELECT count(*) FROM target_state WHERE abs_status IS NOT NULL),
  'retired_abs_count', (SELECT count(*) FROM target_state WHERE abs_status = 'voided' AND voided_at IS NOT NULL),
  'active_target_count', (SELECT count(*) FROM target_state WHERE abs_status = 'approved' AND voided_at IS NULL AND abs_superseded_at IS NULL),
  'service_integrity_count', (SELECT count(*) FROM target_state
    WHERE service_status = 'Approved' AND service_deleted_at = expected_service_deleted_at
      AND service_customer_id = expected_customer_id
      AND lifecycle_updated_at = expected_lifecycle_updated_at AND lifecycle_state_version = 1),
  'quotation_integrity_count', (SELECT count(*) FROM target_state
    WHERE quotation_service_id = service_id AND quotation_status = 'approved'
      AND quotation_is_deleted IS FALSE AND quotation_deleted_at IS NULL
      AND quotation_superseded_at IS NULL AND superseded_by_quotation_id IS NULL
      AND quotation_grand_total = expected_total),
  'items', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'service_id', service_id, 'abs_id', abs_id, 'item_count', item_count,
    'item_digest_matches', item_digest = expected_item_digest
  ) ORDER BY service_id), '[]'::jsonb) FROM item_evidence),
  'batch_event_count', (SELECT count(*) FROM batch_events),
  'batch_distinct_abs_count', (SELECT count(DISTINCT entity_id) FROM batch_events
    WHERE entity_type = 'approved_billing_scope'),
  'batch_non_target_event_count', (SELECT count(*) FROM batch_events
    WHERE entity_type <> 'approved_billing_scope' OR entity_id NOT IN (SELECT abs_id FROM targets)),
  'exact_target_audit_count', (SELECT exact_target_count FROM exact_audit),
  'protected_exclusions', (SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY kind), '[]'::jsonb) FROM excluded_state e),
  'nonzero_downstream_relations', (SELECT nonzero_relations FROM downstream)
) AS postflight;
