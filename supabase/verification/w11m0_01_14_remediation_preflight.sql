WITH t(service_id,quotation_id,abs_id,deleted_at,commercial_total) AS (VALUES
('02bdefe9-6a1e-4dfe-8732-985af7a5df49'::uuid,'307106ce-2a58-4901-bcb6-75abe12b03af'::uuid,'4346aaec-8780-44a4-a4e3-bfcd7ebc3f02'::uuid,'2026-08-17 10:13:40.350+00'::timestamptz,500::numeric),
('1421ecd2-4152-4676-8c41-ec292830e8a2'::uuid,'daa17584-0180-4778-9316-826015b486ac'::uuid,'3de3cf22-8fc3-4115-abc7-0b40cc2c41be'::uuid,'2026-08-17 10:14:35.048+00'::timestamptz,1000::numeric),
('1ac06a50-043a-4ff2-b441-f709da735a52'::uuid,'d286e869-df5f-4510-a5d8-fb3397f6f5e3'::uuid,'3c15e26b-8892-46c3-b669-d95074ebe096'::uuid,'2026-08-17 10:13:40.350+00'::timestamptz,800::numeric),
('3802d0fa-11fe-44ad-b1f8-8503ea8cd8b5'::uuid,'ec4717f4-ed0e-4879-aa6f-a4c3736d3556'::uuid,'c11728f0-3d66-41ed-9c3b-3058ca45ea75'::uuid,'2026-08-17 10:13:40.350+00'::timestamptz,1000::numeric),
('3f7dfffb-3188-49d0-b4ac-3297a95a60e8'::uuid,'591744aa-4684-4463-a782-260af6f90d6a'::uuid,'5811cfed-cd16-48a1-a1e5-100ae67ed425'::uuid,'2026-08-17 10:13:40.350+00'::timestamptz,1000::numeric),
('52d67797-0fd5-466f-a810-2d3c14542b25'::uuid,'bb5756e6-5488-4587-b475-63b8aa9620b3'::uuid,'de7ab306-f1a9-4744-914f-e38e88726920'::uuid,'2026-08-17 10:13:40.350+00'::timestamptz,1000::numeric),
('804c7bbc-0048-4b6d-902c-c74f96d07cbc'::uuid,'dcabf9d8-600b-438c-bd5d-0f2857785cd7'::uuid,'6c248530-744b-416b-a16f-2c3021118d87'::uuid,'2026-08-17 10:14:35.048+00'::timestamptz,500::numeric),
('895638bd-6568-4e48-aac0-876eea91fa88'::uuid,'e2fdd626-cdab-4f34-b7ca-2d52b5412e9d'::uuid,'59d76d2f-86c2-4457-8a95-a6ffc5b577b1'::uuid,'2026-08-17 10:14:35.048+00'::timestamptz,1000::numeric),
('a131fafb-347b-476e-95c0-2329ad641805'::uuid,'401426ab-77df-4b6d-bd87-c511319f91b6'::uuid,'6b7ca133-70c6-4015-9323-4a3bf752434c'::uuid,'2026-08-17 10:13:40.350+00'::timestamptz,1000::numeric),
('a267452a-802b-4d57-8b49-8d161aca508d'::uuid,'afb16e3d-95d0-4823-918e-f7c8f52dd6f5'::uuid,'59839e2a-ec55-4ca5-a770-8e45f433d18a'::uuid,'2026-08-17 10:13:40.350+00'::timestamptz,1000::numeric),
('e084cec0-c0d6-4429-8324-6c2a0f58db7f'::uuid,'51607035-b574-44c5-ae84-f7e676d7a4d8'::uuid,'b13c8a5a-fef4-4dc2-9d9a-7aff7209e5b1'::uuid,'2026-08-17 10:14:35.048+00'::timestamptz,800::numeric),
('e392d1da-bfd1-4b40-ac48-4e5c14afb7c0'::uuid,'90db681e-b166-479e-b4ed-6087266d1dfe'::uuid,'9a77baf7-5df4-48fe-92ad-2cdab810d9af'::uuid,'2026-08-17 10:13:40.350+00'::timestamptz,500::numeric),
('eb92008c-d17e-4eff-9f8b-99c5e5ab8ee0'::uuid,'fd51e91e-af3a-4c0e-897f-0a5afbac766d'::uuid,'ab5d8c9b-37c2-4b2b-b806-9a0a3819b055'::uuid,'2026-08-17 10:14:35.048+00'::timestamptz,1000::numeric),
('f01335fe-0807-46f2-ba02-0a84ca5a67c7'::uuid,'63317742-a4cc-4e6a-86ec-f44075f9a0e8'::uuid,'e92882a7-2d03-415b-8f85-e2533474eb69'::uuid,'2026-08-17 10:13:40.350+00'::timestamptz,1000::numeric)
),
protected_exclusions(kind,service_id,quotation_id,abs_id) AS (VALUES
('completed_sar_800'::text,'c7ca6503-9746-4604-964a-cbe53c118009'::uuid,'87932c67-cdca-4d6c-bb20-691b59f8961f'::uuid,'513f1e78-5bfa-4ff2-a8a8-6986498d1987'::uuid),
('m0_02_1'::text,'3082b962-009c-4e4f-b5c4-ec2adcb27027'::uuid,'30d1f7a6-09a9-4e44-9a0a-f6c15eca5b8f'::uuid,NULL::uuid),
('m0_02_2'::text,'dc395544-9d24-4869-b6c7-ac020dea959f'::uuid,'82dc2e82-19fa-478a-b9a3-6ea6da4a6168'::uuid,NULL::uuid)
)
SELECT current_timestamp observed_at,txid_current_snapshot()::text snapshot_id,
(SELECT count(*) FROM t) target_count,(SELECT count(DISTINCT service_id) FROM t) service_count,(SELECT count(DISTINCT quotation_id) FROM t) quotation_count,(SELECT count(DISTINCT abs_id) FROM t) abs_count,
jsonb_agg(jsonb_build_object(
'service_id',t.service_id,'quotation_id',t.quotation_id,'abs_id',t.abs_id,
'service_status',s.status,'service_deleted_at',s.deleted_at,'cancellation_reason_present',s.cancellation_reason IS NOT NULL,'customer_id',s.customer_id,'customer_deleted',c.is_deleted,'customer_deleted_at',c.deleted_at,
'lifecycle',jsonb_build_array(sl.legacy_status,sl.commercial_state,sl.payment_state,sl.readiness_state,sl.execution_state,sl.completion_state,sl.close_state,sl.start_gate_basis,sl.state_version,sl.mapping_version,sl.updated_at,sl.updated_by),
'quotation',jsonb_build_array(q.service_id,q.status,q.is_deleted,q.deleted_at,q.superseded_at,q.superseded_by_quotation_id,q.subtotal::text,q.discount::text,q.vat_amount::text,q.grand_total::text),
'abs',jsonb_build_array(a.service_id,a.source_quotation_id,a.scope_version,a.status,a.voided_at,a.superseded_at,a.superseded_by_scope_id,a.accepted_subtotal::text,a.accepted_vat_amount::text,a.accepted_grand_total::text,a.source_quotation_subtotal::text,a.source_quotation_vat_amount::text,a.source_quotation_grand_total::text,a.source_currency,a.line_safety_status,a.approved_at),
'scope_count',(SELECT count(*) FROM public.approved_billing_scopes ax WHERE ax.service_id=t.service_id),
'active_scope_count',(SELECT count(*) FROM public.approved_billing_scopes ax WHERE ax.service_id=t.service_id AND ax.status='approved' AND ax.voided_at IS NULL AND ax.superseded_at IS NULL),
'item_count',(SELECT count(*) FROM public.approved_billing_scope_items i WHERE i.approved_billing_scope_id=t.abs_id),
'item_digest',md5(COALESCE((SELECT string_agg(to_jsonb(i)::text,E'\n' ORDER BY i.id) FROM public.approved_billing_scope_items i WHERE i.approved_billing_scope_id=t.abs_id),'')),
'batch_audit_count',(SELECT count(*) FROM public.audit_logs al WHERE al.entity_type='approved_billing_scope' AND al.entity_id=t.abs_id AND al.details->>'batch_id'='W11-M0-01-14-APPROVED-ABS-RETIREMENT'),
'approval_audit',(SELECT jsonb_build_object(
  'row_count',count(*),
  'canonical_approval_count',count(*) FILTER (WHERE
    al.action='status_change'
    AND al.details->>'event_type'='approved_billing_scope_approved'
    AND al.user_id IS NOT DISTINCT FROM a.approved_by
    AND al.timestamp IS NOT DISTINCT FROM a.approved_at
    AND al.details->>'service_id'=t.service_id::text
    AND al.details->>'source_quotation_id'=t.quotation_id::text
    AND al.details->>'quotation_id'=t.quotation_id::text
    AND al.details->>'scope_id'=t.abs_id::text
    AND al.details->>'scope_version'=a.scope_version::text
    AND al.details->>'lifecycle_outcome'='auto_activated'
  ),
  'rows',COALESCE(jsonb_agg(jsonb_build_object(
    'action',al.action,
    'event_type',al.details->>'event_type',
    'actor_matches_approved_by',al.user_id IS NOT DISTINCT FROM a.approved_by,
    'timestamp',al.timestamp,
    'timestamp_matches_approved_at',al.timestamp IS NOT DISTINCT FROM a.approved_at,
    'service_id_matches',al.details->>'service_id'=t.service_id::text,
    'source_quotation_id_matches',al.details->>'source_quotation_id'=t.quotation_id::text,
    'quotation_id_matches',al.details->>'quotation_id'=t.quotation_id::text,
    'scope_id_matches',al.details->>'scope_id'=t.abs_id::text,
    'scope_version_matches',al.details->>'scope_version'=a.scope_version::text,
    'lifecycle_outcome',al.details->>'lifecycle_outcome'
  ) ORDER BY al.timestamp,al.id) FILTER (WHERE al.id IS NOT NULL),'[]'::jsonb)
) FROM public.audit_logs al WHERE al.entity_type='approved_billing_scope' AND al.entity_id=t.abs_id),
'protected_exclusions',(SELECT jsonb_agg(jsonb_build_object(
  'kind',x.kind,
  'service_id',x.service_id,
  'quotation_id',x.quotation_id,
  'abs_id',x.abs_id,
  'service_status',s.status,
  'service_deleted_at',s.deleted_at,
  'quotation_status',q.status,
  'quotation_is_deleted',q.is_deleted,
  'quotation_deleted_at',q.deleted_at,
  'quotation_superseded_at',q.superseded_at,
  'abs_exists',a.id IS NOT NULL,
  'abs_status',a.status,
  'abs_voided_at',a.voided_at,
  'abs_superseded_at',a.superseded_at,
  'abs_is_active',a.status='approved' AND a.voided_at IS NULL AND a.superseded_at IS NULL,
  'service_or_quote_scope_count',(SELECT count(*) FROM public.approved_billing_scopes ax WHERE ax.service_id=x.service_id OR ax.source_quotation_id=x.quotation_id),
  'service_or_quote_active_scope_count',(SELECT count(*) FROM public.approved_billing_scopes ax WHERE (ax.service_id=x.service_id OR ax.source_quotation_id=x.quotation_id) AND ax.status='approved' AND ax.voided_at IS NULL AND ax.superseded_at IS NULL)
) ORDER BY x.kind)
FROM protected_exclusions x
LEFT JOIN public.services s ON s.id=x.service_id
LEFT JOIN public.quotations q ON q.id=x.quotation_id
LEFT JOIN public.approved_billing_scopes a ON a.id=x.abs_id)
) ORDER BY t.service_id) cases
FROM t LEFT JOIN public.services s ON s.id=t.service_id LEFT JOIN public.customers c ON c.id=s.customer_id
LEFT JOIN public.service_lifecycle_states sl ON sl.service_id=t.service_id LEFT JOIN public.quotations q ON q.id=t.quotation_id
LEFT JOIN public.approved_billing_scopes a ON a.id=t.abs_id;
