-- Read-only preservation fingerprint for the W11 M0-01 Completed G8 DEV repair.
-- Run once immediately before migration application and once after governed execution.
-- Output contains row counts and hashes only; it does not expose audit payloads or customer fields.
WITH target_case AS (
    SELECT
        'c7ca6503-9746-4604-964a-cbe53c118009'::uuid AS service_id,
        '87932c67-cdca-4d6c-bb20-691b59f8961f'::uuid AS quotation_id,
        '513f1e78-5bfa-4ff2-a8a8-6986498d1987'::uuid AS abs_id,
        '21db71fc-ac14-44c1-b5f6-03fcfcf64fc9'::uuid AS customer_id
),
target_snapshot AS (
    SELECT jsonb_build_object(
        'service_count', (SELECT count(*) FROM public.services s JOIN target_case t ON t.service_id = s.id),
        'service_hash', (SELECT md5(to_jsonb(s)::text) FROM public.services s JOIN target_case t ON t.service_id = s.id),
        'lifecycle_count', (SELECT count(*) FROM public.service_lifecycle_states sl JOIN target_case t ON t.service_id = sl.service_id),
        'lifecycle_hash', (SELECT md5(to_jsonb(sl)::text) FROM public.service_lifecycle_states sl JOIN target_case t ON t.service_id = sl.service_id),
        'customer_count', (SELECT count(*) FROM public.customers c JOIN target_case t ON t.customer_id = c.id),
        'customer_hash', (SELECT md5(to_jsonb(c)::text) FROM public.customers c JOIN target_case t ON t.customer_id = c.id),
        'quotation_count', (SELECT count(*) FROM public.quotations q JOIN target_case t ON t.quotation_id = q.id),
        'quotation_hash', (SELECT md5(to_jsonb(q)::text) FROM public.quotations q JOIN target_case t ON t.quotation_id = q.id),
        'abs_count', (SELECT count(*) FROM public.approved_billing_scopes a JOIN target_case t ON t.abs_id = a.id),
        'abs_preserved_fields_hash', (
            SELECT md5((to_jsonb(a) - ARRAY['status','voided_at','voided_by','void_reason','updated_by','updated_at'])::text)
            FROM public.approved_billing_scopes a JOIN target_case t ON t.abs_id = a.id
        ),
        'item_count', (SELECT count(*) FROM public.approved_billing_scope_items i JOIN target_case t ON t.abs_id = i.approved_billing_scope_id),
        'item_hash', (
            SELECT md5(COALESCE(string_agg(to_jsonb(i)::text, E'\n' ORDER BY i.id), ''))
            FROM public.approved_billing_scope_items i JOIN target_case t ON t.abs_id = i.approved_billing_scope_id
        ),
        'preexisting_audit_hash', (
            SELECT md5(COALESCE(string_agg(to_jsonb(al)::text, E'\n' ORDER BY al.id), ''))
            FROM public.audit_logs al
            JOIN target_case t ON al.entity_id IN (t.service_id, t.quotation_id, t.abs_id)
            WHERE al.details ->> 'batch_id' IS DISTINCT FROM 'W11-M0-01-COMPLETED-G8-ABS-RETIREMENT'
        )
    ) AS snapshot
),
prior14_snapshot AS (
    SELECT jsonb_build_object(
        'abs_count', count(a.id),
        'abs_rows_hash', md5(COALESCE(string_agg(to_jsonb(a)::text, E'\n' ORDER BY a.id), '')),
        'items_hash', md5(COALESCE(string_agg(
            COALESCE((
                SELECT string_agg(to_jsonb(i)::text, E'\n' ORDER BY i.id)
                FROM public.approved_billing_scope_items i
                WHERE i.approved_billing_scope_id = t.abs_id
            ), ''),
            E'\n' ORDER BY t.abs_id
        ), '')),
        'audit_hash', (
            SELECT md5(COALESCE(string_agg(to_jsonb(al)::text, E'\n' ORDER BY al.entity_id, al.id), ''))
            FROM public.audit_logs al
            WHERE al.entity_type = 'approved_billing_scope'
              AND al.entity_id IN (SELECT abs_id FROM public._w11_m0_01_retirement_targets())
        )
    ) AS snapshot
    FROM public._w11_m0_01_retirement_targets() t
    LEFT JOIN public.approved_billing_scopes a ON a.id = t.abs_id
),
m0_02_cases(case_key, service_id, quotation_id) AS (
    VALUES
        ('m0_02_1'::text, '3082b962-009c-4e4f-b5c4-ec2adcb27027'::uuid, '30d1f7a6-09a9-4e44-9a0a-f6c15eca5b8f'::uuid),
        ('m0_02_2'::text, 'dc395544-9d24-4869-b6c7-ac020dea959f'::uuid, '82dc2e82-19fa-478a-b9a3-6ea6da4a6168'::uuid)
),
m0_02_rows AS (
    SELECT
        c.case_key,
        c.service_id,
        c.quotation_id,
        (SELECT count(*) FROM public.services s WHERE s.id = c.service_id) AS service_count,
        (SELECT md5(to_jsonb(s)::text) FROM public.services s WHERE s.id = c.service_id) AS service_hash,
        (SELECT count(*) FROM public.quotations q WHERE q.id = c.quotation_id) AS quotation_count,
        (SELECT md5(to_jsonb(q)::text) FROM public.quotations q WHERE q.id = c.quotation_id) AS quotation_hash,
        (SELECT count(*) FROM public.approved_billing_scopes a
         WHERE a.service_id = c.service_id OR a.source_quotation_id = c.quotation_id) AS scope_count,
        (SELECT md5(COALESCE(string_agg(to_jsonb(a)::text, E'\n' ORDER BY a.id), ''))
         FROM public.approved_billing_scopes a
         WHERE a.service_id = c.service_id OR a.source_quotation_id = c.quotation_id) AS scope_hash,
        (SELECT count(*) FROM public.audit_logs al
         WHERE al.entity_id IN (c.service_id, c.quotation_id)
            OR al.details ->> 'service_id' = c.service_id::text
            OR al.details ->> 'quotation_id' = c.quotation_id::text) AS audit_count,
        (SELECT md5(COALESCE(string_agg(to_jsonb(al)::text, E'\n' ORDER BY al.entity_id, al.id), ''))
         FROM public.audit_logs al
         WHERE al.entity_id IN (c.service_id, c.quotation_id)
            OR al.details ->> 'service_id' = c.service_id::text
            OR al.details ->> 'quotation_id' = c.quotation_id::text) AS audit_hash
    FROM m0_02_cases c
),
m0_02_snapshot AS (
    SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.case_key), '[]'::jsonb) AS snapshot
    FROM m0_02_rows r
),
m0_03_references(invoice_id) AS (
    VALUES
        ('040cdd06-76c7-4110-8307-73eea19c8e34'::uuid),
        ('0b9ac36f-ece0-4dff-a057-e4631d0d166f'::uuid),
        ('0eaf57a1-218d-481b-8240-9ad5bba64bc8'::uuid),
        ('1f1402cb-ec67-4db0-b8ad-332e9e09036c'::uuid),
        ('2a7b06c0-2167-4456-af74-1e2e0b1c22ca'::uuid),
        ('3175e652-bab7-4d90-8096-b4cb3c1daf37'::uuid),
        ('3eaf8f70-da39-4bda-a4f4-9601692c7ffa'::uuid),
        ('75154bb3-1c14-43fd-b9a5-a86cad2fb831'::uuid),
        ('7ce5a763-3180-43ad-b0f1-0a8fa2431b02'::uuid),
        ('99bb7f1b-5201-4992-bd7d-75c00ccb3097'::uuid),
        ('b3480d1a-e929-4461-8190-61fd3928d879'::uuid),
        ('d0a7179c-4319-4f9d-b821-eeb76778725f'::uuid),
        ('eba1b438-80fb-4cea-bd2d-822568e25357'::uuid),
        ('f78093d2-db60-481e-893e-fa4de40c23b5'::uuid)
),
m0_03_snapshot AS (
    SELECT jsonb_build_object(
        'reference_count', (SELECT count(*) FROM m0_03_references),
        'audit_row_count', count(al.id),
        'distinct_audit_reference_count', count(DISTINCT al.entity_id),
        'invoice_created_event_count', count(*) FILTER (
            WHERE al.action = 'create' AND al.details ->> 'event_type' = 'invoice.created'
        ),
        'source_invoice_row_count', (SELECT count(*) FROM public.invoices i JOIN m0_03_references r ON r.invoice_id = i.id),
        'raw_audit_hash', md5(COALESCE(string_agg(to_jsonb(al)::text, E'\n' ORDER BY al.entity_id, al.id), ''))
    ) AS snapshot
    FROM m0_03_references r
    LEFT JOIN public.audit_logs al ON al.entity_id = r.invoice_id
)
SELECT jsonb_build_object(
    'target_preserved_state', (SELECT snapshot FROM target_snapshot),
    'prior_14_repairs', (SELECT snapshot FROM prior14_snapshot),
    'm0_02_preservation', (SELECT snapshot FROM m0_02_snapshot),
    'm0_03_raw_evidence_preservation', (SELECT snapshot FROM m0_03_snapshot)
) AS preservation_snapshot;
