-- READ ONLY. Run only after a separately authorized DEV apply.
-- Never run this plan against DEMO or PROD.

WITH active_services AS (
    SELECT s.id
    FROM public.services s
    WHERE s.deleted_at IS NULL
),
missing_lifecycle AS (
    SELECT s.id
    FROM public.services s
    LEFT JOIN public.service_lifecycle_states l
        ON l.service_id = s.id
    WHERE s.deleted_at IS NULL
      AND l.service_id IS NULL
)
SELECT
    (SELECT count(*) FROM active_services) AS active_service_count,
    (SELECT count(*) FROM missing_lifecycle) AS active_missing_lifecycle_count,
    round(
        100.0 * (
            (SELECT count(*) FROM active_services)
            - (SELECT count(*) FROM missing_lifecycle)
        ) / NULLIF((SELECT count(*) FROM active_services), 0),
        2
    ) AS active_lifecycle_coverage_percent;

SELECT
    s.id AS service_id,
    s.status AS legacy_status,
    s.deleted_at,
    l.legacy_status AS projected_legacy_status,
    l.commercial_state,
    l.payment_state,
    l.readiness_state,
    l.execution_state,
    l.completion_state,
    l.close_state,
    l.start_gate_basis,
    l.state_version,
    l.mapping_version,
    (
        s.deleted_at IS NULL
        AND s.status = 'Quoted'
        AND l.legacy_status = 'Quoted'
        AND l.commercial_state = 'quoted'
        AND l.payment_state = 'unassessed'
        AND l.readiness_state = 'unassessed'
        AND l.execution_state = 'not_started'
        AND l.completion_state = 'pending'
        AND l.close_state = 'open'
        AND l.start_gate_basis IS NULL
        AND l.state_version = 0
        AND l.mapping_version = 'w3-v1'
    ) AS canonical_quoted_projection
FROM public.services s
LEFT JOIN public.service_lifecycle_states l
    ON l.service_id = s.id
WHERE s.id IN (
    '6371cd1f-69af-4b86-9096-b36c1e56bab0'::uuid,
    'cd3448ff-c8cf-4ba4-89c0-6d6bd2f0b164'::uuid
)
ORDER BY s.id;

SELECT count(*) AS duplicate_lifecycle_service_ids
FROM (
    SELECT l.service_id
    FROM public.service_lifecycle_states l
    GROUP BY l.service_id
    HAVING count(*) > 1
) duplicates;

SELECT
    p.oid::regprocedure AS function_signature,
    p.prosecdef AS security_definer,
    p.proconfig AS function_settings,
    p.provolatile::text AS volatility,
    p.proacl::text AS function_acl,
    position('INSERT INTO public.service_lifecycle_states' IN pg_get_functiondef(p.oid)) > 0
        AS creates_projection_atomically,
    position('service_lifecycle_unavailable' IN pg_get_functiondef(p.oid)) > 0
        AS replay_fails_closed_without_projection
FROM pg_proc p
WHERE p.oid = to_regprocedure(
    'public.create_service_atomic(uuid,text,text,text,date,date,text,text,numeric,text,text,text)'
);

SELECT
    pg_get_constraintdef(c.oid) AS state_version_constraint,
    pg_get_constraintdef(c.oid) = 'CHECK ((state_version >= 0))'
        AS permits_canonical_initial_version
FROM pg_constraint c
WHERE c.conrelid = 'public.service_lifecycle_states'::regclass
  AND c.conname = 'service_lifecycle_states_version_check';

SELECT
    md5(p.prosrc) AS transition_source_md5,
    md5(p.prosrc) = '66b7e475dc3521a1ef70755b743cbdc1'
        AS transition_function_unchanged,
    p.proconfig AS function_settings,
    p.proacl::text AS function_acl
FROM pg_proc p
WHERE p.oid = to_regprocedure(
    'public.transition_service_lifecycle(uuid,text,text,text,text,text,uuid)'
);

-- The migration's only business-row DML is two inserts into
-- service_lifecycle_states for the IDs above. Compare the reviewed migration
-- DML manifest with this post-apply database state; no Service status,
-- quotation, ABS, invoice, payment, customer, supplier, accounting, or audit
-- rows are written by the migration. Atomic rollback and replay behavior are
-- covered by the separate disposable-database regression script.
