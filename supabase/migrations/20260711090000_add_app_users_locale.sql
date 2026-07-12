-- Feature 005: durable per-user runtime locale persistence.
-- DEV/DEMO apply only after separate migration-file review and explicit Mozfer approval.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.app_users') IS NULL THEN
    RAISE EXCEPTION 'Feature 005 locale migration requires public.app_users to exist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_attribute AS attr
    WHERE attr.attrelid = 'public.app_users'::regclass
      AND attr.attname = 'locale'
      AND attr.attnum > 0
      AND NOT attr.attisdropped
  ) THEN
    RAISE EXCEPTION 'Feature 005 locale migration halted: public.app_users.locale already exists; inspect schema drift before retrying';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint AS constraint_item
    WHERE constraint_item.conrelid = 'public.app_users'::regclass
      AND constraint_item.conname = 'app_users_locale_check'
  ) THEN
    RAISE EXCEPTION 'Feature 005 locale migration halted: app_users_locale_check already exists; inspect schema drift before retrying';
  END IF;
END
$$;

ALTER TABLE public.app_users
  ADD COLUMN locale text NOT NULL DEFAULT 'en';

ALTER TABLE public.app_users
  ADD CONSTRAINT app_users_locale_check
  CHECK (locale IN ('en', 'ar'));

COMMIT;
