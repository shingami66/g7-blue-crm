-- READ-ONLY DEV/DEMO AUDIT — NO WRITES.
-- Feature 005 T001: public.app_users locale schema evidence packet.
-- Mozfer must run this manually in the Supabase DEV/DEMO SQL Editor only.
-- This packet contains SELECT / WITH ... SELECT catalog and aggregate inspection only.
-- Do not run it against production. Do not add, remove, or alter any statement.

-- Result set 1: target table existence and table-level state.
WITH target AS (
  SELECT to_regclass('public.app_users') AS table_oid
)
SELECT
  'table_existence' AS result_set,
  target.table_oid IS NOT NULL AS app_users_exists,
  target.table_oid::text AS resolved_relation,
  cls.relkind AS relation_kind,
  cls.relrowsecurity AS row_level_security_enabled,
  cls.relforcerowsecurity AS row_level_security_forced
FROM target
LEFT JOIN pg_catalog.pg_class AS cls ON cls.oid = target.table_oid;

-- Result set 2: locale column existence and complete catalog definition.
-- The query does not reference public.app_users.locale directly, so it is safe when
-- the locale column is absent. If Result set 1 reports no table, stop and return HOLD.
WITH target AS (
  SELECT to_regclass('public.app_users') AS table_oid
)
SELECT
  'locale_column_definition' AS result_set,
  target.table_oid IS NOT NULL AS app_users_exists,
  attr.attnum IS NOT NULL AS locale_column_exists,
  attr.attnum AS ordinal_position,
  attr.attname AS column_name,
  format_type(attr.atttypid, attr.atttypmod) AS formatted_postgres_type,
  typ.typname AS declared_type_name,
  typ_ns.nspname AS declared_type_schema,
  typ.typtype AS declared_type_kind,
  format_type(COALESCE(NULLIF(typ.typbasetype, 0), typ.oid), NULL) AS underlying_postgres_type,
  base_typ.typname AS underlying_type_name,
  base_ns.nspname AS underlying_type_schema,
  column_info.character_maximum_length AS maximum_length,
  NOT attr.attnotnull AS is_nullable,
  pg_get_expr(def.adbin, def.adrelid) AS default_expression,
  attr.attidentity AS identity_state,
  attr.attgenerated AS generated_state
FROM target
LEFT JOIN pg_catalog.pg_attribute AS attr
  ON attr.attrelid = target.table_oid
 AND attr.attname = 'locale'
 AND attr.attnum > 0
 AND NOT attr.attisdropped
LEFT JOIN pg_catalog.pg_type AS typ ON typ.oid = attr.atttypid
LEFT JOIN pg_catalog.pg_namespace AS typ_ns ON typ_ns.oid = typ.typnamespace
LEFT JOIN pg_catalog.pg_type AS base_typ
  ON base_typ.oid = COALESCE(NULLIF(typ.typbasetype, 0), typ.oid)
LEFT JOIN pg_catalog.pg_namespace AS base_ns ON base_ns.oid = base_typ.typnamespace
LEFT JOIN pg_catalog.pg_attrdef AS def
  ON def.adrelid = attr.attrelid
 AND def.adnum = attr.attnum
LEFT JOIN information_schema.columns AS column_info
  ON column_info.table_schema = 'public'
 AND column_info.table_name = 'app_users'
 AND column_info.column_name = 'locale';

-- Result set 3: enum/domain enforcement attached to the locale column, if present.
WITH target AS (
  SELECT to_regclass('public.app_users') AS table_oid
), locale_type AS (
  SELECT
    attr.attnum IS NOT NULL AS locale_column_exists,
    typ.oid AS declared_type_oid,
    typ.typtype AS declared_type_kind,
    typ.typname AS declared_type_name,
    typ_ns.nspname AS declared_type_schema,
    COALESCE(NULLIF(typ.typbasetype, 0), typ.oid) AS underlying_type_oid
  FROM target
  LEFT JOIN pg_catalog.pg_attribute AS attr
    ON attr.attrelid = target.table_oid
   AND attr.attname = 'locale'
   AND attr.attnum > 0
   AND NOT attr.attisdropped
  LEFT JOIN pg_catalog.pg_type AS typ ON typ.oid = attr.atttypid
  LEFT JOIN pg_catalog.pg_namespace AS typ_ns ON typ_ns.oid = typ.typnamespace
)
SELECT
  'locale_type_enforcement' AS result_set,
  locale_type.locale_column_exists,
  locale_type.declared_type_schema,
  locale_type.declared_type_name,
  locale_type.declared_type_kind,
  base_typ_ns.nspname AS underlying_type_schema,
  base_typ.typname AS underlying_type_name,
  base_typ.typtype AS underlying_type_kind,
  array_remove(array_agg(enum_value.enumlabel ORDER BY enum_value.enumsortorder), NULL) AS enum_allowed_values,
  domain_constraint.conname AS domain_constraint_name,
  CASE domain_constraint.contype
    WHEN 'c' THEN 'CHECK'
    ELSE domain_constraint.contype::text
  END AS domain_constraint_type,
  pg_get_constraintdef(domain_constraint.oid, true) AS domain_constraint_definition
FROM locale_type
LEFT JOIN pg_catalog.pg_type AS base_typ ON base_typ.oid = locale_type.underlying_type_oid
LEFT JOIN pg_catalog.pg_namespace AS base_typ_ns ON base_typ_ns.oid = base_typ.typnamespace
LEFT JOIN pg_catalog.pg_enum AS enum_value ON enum_value.enumtypid = base_typ.oid
LEFT JOIN pg_catalog.pg_constraint AS domain_constraint
  ON domain_constraint.contypid = locale_type.declared_type_oid
GROUP BY
  locale_type.locale_column_exists,
  locale_type.declared_type_schema,
  locale_type.declared_type_name,
  locale_type.declared_type_kind,
  base_typ_ns.nspname,
  base_typ.typname,
  base_typ.typtype,
  domain_constraint.conname,
  domain_constraint.contype,
  domain_constraint.oid;

-- Result set 4: every table constraint on public.app_users, with an explicit
-- locale-reference flag. This discovers enforcement by definition, not guessed name.
WITH target AS (
  SELECT to_regclass('public.app_users') AS table_oid
)
SELECT
  'app_users_constraints' AS result_set,
  constraint_item.conname AS object_name,
  CASE constraint_item.contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'x' THEN 'EXCLUSION'
    ELSE constraint_item.contype::text
  END AS object_type,
  pg_get_constraintdef(constraint_item.oid, true) AS exact_definition,
  CASE constraint_item.convalidated WHEN true THEN 'validated' WHEN false THEN 'not_validated' END AS enabled_state,
  pg_get_constraintdef(constraint_item.oid, true) ILIKE '%locale%' AS references_locale
FROM target
JOIN pg_catalog.pg_constraint AS constraint_item
  ON constraint_item.conrelid = target.table_oid
ORDER BY constraint_item.contype, constraint_item.conname;

-- Result set 5: every non-internal trigger on public.app_users. Returning all
-- definitions avoids relying on a guessed locale-trigger name.
WITH target AS (
  SELECT to_regclass('public.app_users') AS table_oid
)
SELECT
  'app_users_triggers' AS result_set,
  trigger_item.tgname AS object_name,
  'TRIGGER' AS object_type,
  pg_get_triggerdef(trigger_item.oid, true) AS exact_definition,
  CASE trigger_item.tgenabled
    WHEN 'O' THEN 'enabled_origin'
    WHEN 'D' THEN 'disabled'
    WHEN 'R' THEN 'enabled_replica'
    WHEN 'A' THEN 'enabled_always'
    ELSE trigger_item.tgenabled::text
  END AS enabled_state,
  procedure_ns.nspname AS function_schema,
  procedure_item.proname AS function_name,
  pg_get_triggerdef(trigger_item.oid, true) ILIKE '%locale%' AS references_locale
FROM target
JOIN pg_catalog.pg_trigger AS trigger_item
  ON trigger_item.tgrelid = target.table_oid
 AND NOT trigger_item.tgisinternal
LEFT JOIN pg_catalog.pg_proc AS procedure_item ON procedure_item.oid = trigger_item.tgfoid
LEFT JOIN pg_catalog.pg_namespace AS procedure_ns ON procedure_ns.oid = procedure_item.pronamespace
ORDER BY trigger_item.tgname;

-- Result set 6: aggregate-only existing-user compatibility summary.
-- It reads each row as JSONB, never directly references a possibly absent locale column,
-- and returns no IDs, names, emails, phones, UUIDs, or other user-level data.
-- Run this only after Result set 1 confirms public.app_users exists.
WITH locale_values AS (
  SELECT to_jsonb(app_user_row) ->> 'locale' AS locale_value
  FROM public.app_users AS app_user_row
)
SELECT
  'existing_user_compatibility_summary' AS result_set,
  count(*) AS total_user_rows,
  count(*) FILTER (WHERE locale_value IS NULL) AS rows_with_no_locale_value,
  count(*) FILTER (WHERE locale_value = 'en') AS rows_with_en,
  count(*) FILTER (WHERE locale_value = 'ar') AS rows_with_ar,
  count(*) FILTER (WHERE locale_value IS NOT NULL AND locale_value NOT IN ('en', 'ar')) AS rows_with_values_outside_en_ar
FROM locale_values;

-- Result set 7: aggregate-only distribution of existing locale values.
-- A NULL locale_value means no value (including the expected case where the column is absent).
WITH locale_values AS (
  SELECT to_jsonb(app_user_row) ->> 'locale' AS locale_value
  FROM public.app_users AS app_user_row
)
SELECT
  'existing_locale_value_distribution' AS result_set,
  locale_value,
  count(*) AS user_row_count,
  locale_value IS NOT NULL AND locale_value NOT IN ('en', 'ar') AS is_outside_approved_set
FROM locale_values
GROUP BY locale_value
ORDER BY locale_value NULLS FIRST;
