-- Migration: Company Settings Production RLS Follow-up
-- Date: 2026-07-03
-- Purpose:
--   1. Reassert RLS on public.company_settings for production safety.
--   2. Remove the broad DEV-only authenticated policy if it still exists.
--   3. Keep current access server-mediated through service-role-backed server code
--      after application RBAC checks, with no new broad authenticated policies.
--
-- IMPORTANT: Do NOT run this automatically.
--            Apply manually via Supabase SQL Editor after review.

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Current application settings reads/writes use protected server code with the
-- service role after app-level RBAC and server-side masking. Do not add broad
-- anon/authenticated table policies here.
DROP POLICY IF EXISTS "DEV_ONLY_company_settings" ON public.company_settings;
