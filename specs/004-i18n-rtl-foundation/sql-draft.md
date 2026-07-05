# I18N / RTL Foundation SQL Draft

## Review Status

- NOT APPLIED
- NOT A MIGRATION
- REVIEW REQUIRED BEFORE MIGRATION FILE
- DO NOT RUN DIRECTLY WITHOUT APPROVAL

## Scope

This draft covers only the reviewed schema direction for:

- `app_users.locale`
- `company_settings.default_locale`

It does not create or apply a migration file.
It does not modify Supabase migration directories.
It does not add document language runtime behavior.

## 1. `app_users.locale`

### Purpose

- Authenticated user UI locale source of truth once migrated.

### Allowed Values

- `en`
- `ar`

### Nullability / Default

- Nullable
- No database default
- Equivalent database intent: `DEFAULT NULL`

### Enforcement

- PostgreSQL `CHECK` constraint allowing only `en` or `ar` when non-null

### Draft SQL Shape

```sql
-- DRAFT ONLY. NOT APPLIED. NOT A MIGRATION.
ALTER TABLE public.app_users
  ADD COLUMN locale text;

ALTER TABLE public.app_users
  ADD CONSTRAINT app_users_locale_check
  CHECK (locale IS NULL OR locale IN ('en', 'ar'));

COMMENT ON COLUMN public.app_users.locale IS
  'Authenticated user UI locale source of truth once approved and migrated.';
```

### Application Read Order

1. Explicit `app_users.locale`
2. `company_settings.default_locale`
3. Hardcoded `en` fallback

### Governance Notes

- Do NOT use `DEFAULT 'en'`.
- Company default must not override an explicit user preference.
- The override rule is application read-order logic, not a DB trigger or DB constraint.

## 2. `company_settings.default_locale`

### Purpose

- Company-level seed/default only

### Allowed Values

- `en`
- `ar`

### Default

- `en`

### Enforcement

- PostgreSQL `CHECK` constraint

### Draft SQL Shape

```sql
-- DRAFT ONLY. NOT APPLIED. NOT A MIGRATION.
ALTER TABLE public.company_settings
  ADD COLUMN default_locale text NOT NULL DEFAULT 'en';

ALTER TABLE public.company_settings
  ADD CONSTRAINT company_settings_default_locale_check
  CHECK (default_locale IN ('en', 'ar'));

COMMENT ON COLUMN public.company_settings.default_locale IS
  'Company-level locale seed/default only. Must not override explicit app_users.locale.';
```

### Governance Notes

- Seeds first login/default only.
- Must not override explicit `app_users.locale`.
- The override rule is application read-order logic, not a DB trigger or DB constraint.

## 3. Deferred Document Locale Note

- Do not create `document_locale` schema in Foundation-1.
- `document_locale` belongs to future `DOCUMENT-LANGUAGE-SNAPSHOT-1` or a separately reviewed document snapshot task.
- Document language must be captured explicitly at document creation later.
- It must not be inherited from the creator UI session locale.
- Do not modify quotation/invoice creation logic in this task.
- Do not modify PDF routes in this task.

## 4. Deferred Customer Preferred Language Note

- Do not add Customer `preferred_language` in Foundation-1.
- Evaluate it later with document language work.

## Migration Review Checklist

- Keep migration creation separate from this draft.
- Reconfirm current live schema before writing a migration.
- Reconfirm constraint names and column comments during migration review.
- Keep document/PDF language work deferred until the separate document-language task is approved.
