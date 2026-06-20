-- =============================================================================
-- Migration: Remove DEV_ONLY RLS Policies
-- Date: 2026-06-20
-- Purpose:
--   1. Remove broad development-only RLS policies from core tables.
--   2. Deny direct anon/authenticated table access by relying on RLS with no
--      replacement broad allow policies.
--   3. Preserve the server-mediated access model through Server Actions and
--      service-role Supabase admin paths after application RBAC checks.
--
-- IMPORTANT: Do NOT run this automatically.
--            Apply manually via Supabase SQL Editor after review.
--
-- SECURITY NOTE:
-- These DROP POLICY statements intentionally do not add replacement
-- authenticated policies. Browser users must not directly access these tables;
-- application reads/writes remain server-mediated through protected server code.
-- Existing RPC/function grants are intentionally left unchanged.
-- =============================================================================

-- Keep RLS enabled on all affected tables. With no broad authenticated allow
-- policies, anon/authenticated direct table access is denied by default.
ALTER TABLE number_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Confirmed high-risk DEV_ONLY policies from SEC-DB-ACCESS-1 /
-- SEC-DB-EVIDENCE-1 / SEC-RLS-PLAN-1.
DROP POLICY IF EXISTS "DEV_ONLY_company_settings" ON company_settings;
DROP POLICY IF EXISTS "DEV_ONLY_customers" ON customers;
DROP POLICY IF EXISTS "DEV_ONLY_services" ON services;
DROP POLICY IF EXISTS "DEV_ONLY_quotations" ON quotations;
DROP POLICY IF EXISTS "DEV_ONLY_invoices" ON invoices;
DROP POLICY IF EXISTS "DEV_ONLY_payments" ON payments;

-- Additional DEV_ONLY policies found during SEC-RLS-BASELINE-1 inspection.
DROP POLICY IF EXISTS "DEV_ONLY_number_sequences" ON number_sequences;
DROP POLICY IF EXISTS "DEV_ONLY_suppliers" ON suppliers;
DROP POLICY IF EXISTS "DEV_ONLY_quotation_items" ON quotation_items;
DROP POLICY IF EXISTS "DEV_ONLY_invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "DEV_ONLY_projects" ON projects;
DROP POLICY IF EXISTS "DEV_ONLY_project_tasks" ON project_tasks;
DROP POLICY IF EXISTS "DEV_ONLY_audit_logs" ON audit_logs;
