-- READ-ONLY DEV/DEMO POST-APPLY VERIFICATION — NO WRITES
-- Feature 005 T009. Run only in the authorized G7 DEV/DEMO database.

SELECT
  c.table_schema,
  c.table_name,
  c.column_name,
  c.ordinal_position,
  c.data_type AS information_schema_type,
  format_type(a.atttypid, a.atttypmod) AS underlying_postgresql_type,
  c.is_nullable,
  c.column_default,
  c.is_generated,
  c.is_identity,
  (c.table_schema = 'public' AND c.table_name = 'app_users' AND c.column_name = 'locale') AS expected_column_identity,
  (c.data_type = 'text' AND format_type(a.atttypid, a.atttypmod) = 'text') AS expected_text_type,
  (c.is_nullable = 'NO') AS expected_not_null,
  (c.column_default = '''en''::text') AS expected_default,
  (c.is_generated = 'NEVER' AND c.is_identity = 'NO') AS expected_not_generated_or_identity
FROM information_schema.columns AS c
LEFT JOIN pg_catalog.pg_class AS rel
  ON rel.relname = c.table_name
LEFT JOIN pg_catalog.pg_namespace AS ns
  ON ns.oid = rel.relnamespace
 AND ns.nspname = c.table_schema
LEFT JOIN pg_catalog.pg_attribute AS a
  ON a.attrelid = rel.oid
 AND a.attname = c.column_name
 AND a.attnum > 0
 AND NOT a.attisdropped
WHERE c.table_schema = 'public'
  AND c.table_name = 'app_users'
  AND c.column_name = 'locale';

SELECT
  (to_regclass('public.app_users') IS NOT NULL) AS app_users_exists,
  (to_regclass('public.app_users') IS NOT NULL AND EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute AS a
    WHERE a.attrelid = 'public.app_users'::regclass
      AND a.attname = 'locale'
      AND a.attnum > 0
      AND NOT a.attisdropped
  )) AS locale_exists;

SELECT
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'x' THEN 'EXCLUSION'
    ELSE con.contype::text
  END AS constraint_type,
  con.convalidated AS is_validated,
  pg_catalog.pg_get_constraintdef(con.oid, true) AS constraint_definition,
  (con.conname = 'app_users_locale_check') AS is_expected_constraint_name,
  (con.contype = 'c' AND pg_catalog.pg_get_constraintdef(con.oid, true) = 'CHECK ((locale = ANY (ARRAY[''en''::text, ''ar''::text])))') AS is_expected_locale_check
FROM pg_catalog.pg_constraint AS con
WHERE con.conrelid = 'public.app_users'::regclass
  AND (con.conname ILIKE '%locale%' OR pg_catalog.pg_get_constraintdef(con.oid, true) ILIKE '%locale%')
ORDER BY con.conname;

SELECT
  COUNT(*) FILTER (WHERE con.conname ILIKE '%locale%' OR pg_catalog.pg_get_constraintdef(con.oid, true) ILIKE '%locale%') AS locale_related_constraint_count,
  COUNT(*) FILTER (WHERE con.conname = 'app_users_locale_check') AS exact_named_constraint_count,
  COUNT(*) FILTER (WHERE con.contype = 'c' AND con.conname = 'app_users_locale_check' AND con.convalidated AND pg_catalog.pg_get_constraintdef(con.oid, true) = 'CHECK ((locale = ANY (ARRAY[''en''::text, ''ar''::text])))') AS exact_validated_definition_count
FROM pg_catalog.pg_constraint AS con
WHERE con.conrelid = 'public.app_users'::regclass;

SELECT
  COUNT(*) AS total_app_users,
  COUNT(*) FILTER (WHERE locale = 'en') AS en_rows,
  COUNT(*) FILTER (WHERE locale = 'ar') AS ar_rows,
  COUNT(*) FILTER (WHERE locale IS NULL) AS null_rows,
  COUNT(*) FILTER (WHERE locale IS NOT NULL AND locale NOT IN ('en', 'ar')) AS outside_approved_rows
FROM public.app_users;

SELECT
  locale,
  COUNT(*) AS row_count
FROM public.app_users
GROUP BY locale
ORDER BY locale NULLS FIRST;

SELECT
  n.nspname AS table_schema,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'app_users';

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename = 'app_users'
ORDER BY policyname;

SELECT
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'app_users'
ORDER BY grantee, privilege_type;

SELECT
  tg.tgname AS trigger_name,
  CASE tg.tgenabled
    WHEN 'O' THEN 'enabled'
    WHEN 'D' THEN 'disabled'
    WHEN 'R' THEN 'replica'
    WHEN 'A' THEN 'always'
    ELSE tg.tgenabled::text
  END AS enabled_state,
  pg_catalog.pg_get_triggerdef(tg.oid, true) AS trigger_definition,
  (tg.tgname = 'update_app_users_updated_at') AS is_expected_updated_at_trigger,
  (tg.tgname ILIKE '%locale%' OR pg_catalog.pg_get_triggerdef(tg.oid, true) ILIKE '%locale%') AS appears_locale_specific
FROM pg_catalog.pg_trigger AS tg
WHERE tg.tgrelid = 'public.app_users'::regclass
  AND NOT tg.tgisinternal
ORDER BY tg.tgname;

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'app_users'
ORDER BY indexname;

SELECT
  'Invalid-value rejection is verified for this gate by metadata only: NOT NULL and the validated CHECK definition.' AS verification_boundary,
  'No INSERT or UPDATE test is performed; any future mutation test requires separate approval, synthetic data, and guaranteed rollback.' AS mutation_test_boundary;
