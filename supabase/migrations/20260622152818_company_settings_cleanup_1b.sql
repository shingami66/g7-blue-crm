-- Migration: COMPANY-SETTINGS-CLEANUP-1B
-- Make cr_number optional as CR is unconfirmed and shouldn't require fake placeholder values.

ALTER TABLE company_settings ALTER COLUMN cr_number DROP NOT NULL;
