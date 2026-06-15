---
name: g7-security-hardening-guard
description: Use before or after G7 BLUE CRM work involving security, Clerk auth, RBAC, Supabase RLS, SQL migrations, RPCs, Server Actions, APIs, webhooks, secrets, invoices, payments, Company Settings, deployment, production readiness, or AI/LLM features.
---

# G7 Security Hardening Guard

## Purpose

Use this repo-local guard to protect G7 BLUE CRM from security regressions around auth, authorization, database exposure, financial data, secrets, production readiness, and AI/LLM behavior. Ground reviews conceptually in OWASP Top 10, OWASP API Security Top 10, OWASP LLM Top 10, NIST CSF 2.0, NIST SSDF SP 800-218, CISA Secure by Design, Supabase Row Level Security guidance, and Clerk/Next.js auth best practices; do not copy framework text or claim compliance.

Product context:

- Product: G7 BLUE Events CRM + ERP-like Billing System.
- Stack: Next.js App Router, TypeScript, Tailwind, Supabase/PostgreSQL, Clerk Auth.
- Architecture: modular monolith with external Supabase and Clerk.
- Sensitive data: customers, services, quotations, invoices, payments, company settings, VAT/TIN/CR data, bank details, roles, and permissions.
- Real client or company data requires production security readiness.

## Relationship With `$g7-crm-erp-guard`

Use this skill beside `$g7-crm-erp-guard`, not instead of it. `$g7-crm-erp-guard` defines and protects business workflow correctness. `$g7-security-hardening-guard` enforces security, access control, database exposure protection, secrets safety, production readiness, and AI/LLM safety.

If a change touches both business workflow and security, apply both guards and keep blocking security issues separate from optional business improvements.

## When To Use This Skill

Use this skill before coding security-sensitive work, after reviewing any relevant diff, before deployment or real-data use, and before adding any AI/LLM feature. It applies to Clerk auth, RBAC, Supabase RLS, SQL migrations, RPCs, SECURITY DEFINER functions, Server Actions, APIs, webhooks, secrets, invoices, payments, Company Settings, environment/deployment configuration, logging, audit trails, and dependency risk.

## The Four Modes

Choose one mode from the user's request and current task state:

- Mode 1 - Pre-Implementation Security Planning: use before coding security-sensitive work.
- Mode 2 - Post-Implementation Security Review: use after code, SQL, Server Actions, APIs, docs, tests, or diff changes.
- Mode 3 - Production Readiness Security Gate: use before deployment or before using real client/company data. Prioritize this mode for real-data safety.
- Mode 4 - AI/LLM Security Gate: use before adding or shipping any AI/LLM feature.

If the request is ambiguous, default to the safest applicable mode. For planning, do not code. For reviews and gates, produce a verdict and separate blocking issues from optional improvements.

## Required Output Formats

Mode 1 must output exactly these sections:

1. Security Scope
2. Protected Assets
3. Threats / Abuse Cases
4. Required Auth/RBAC Checks
5. Data Access / RLS / SQL Implications
6. Input Validation / Injection Risks
7. Secrets / Environment Risks
8. Logging / Audit / Monitoring Needs
9. Tests / Manual Verification Required
10. Open Security Decisions
11. Safe Implementation Outline
12. Do Not Code Yet Until Approved

Mode 2 must output exactly these sections:

1. Verdict: Pass / Needs Changes
2. Auth/RBAC Findings
3. Supabase/RLS/SQL Findings
4. Server Action/API Findings
5. Input Validation/Injection Findings
6. Secrets/Environment Findings
7. Invoice/Payment/VAT Safety Findings
8. Logging/Audit Findings
9. Dependency/Supply Chain Findings
10. Required Fixes Before Commit
11. Optional Improvements

Mode 3 must output exactly these sections:

1. Verdict: Ready / Not Ready
2. Blocking Security Issues
3. RLS and Database Exposure
4. Auth/RBAC Coverage
5. Secrets and Deployment Safety
6. Logging/Audit/Monitoring
7. Backup/Recovery
8. Manual Verification Checklist
9. Required Fixes Before Real Data

Mode 4 must output exactly these sections:

1. Verdict: Allowed / Blocked Until Safer
2. Prompt Injection Risks
3. Data Exposure Risks
4. Tool/Action Permission Risks
5. Output Validation Requirements
6. Rate/Cost Abuse Risks
7. Required Safety Controls
8. Do Not Ship Until Approved

## Core Security Principles

- Secure by design.
- Least privilege.
- Deny by default.
- Authentication is not authorization.
- Server-side authorization is mandatory.
- Client-side checks are UX only.
- Never trust client-submitted roles, permissions, IDs, statuses, totals, paid amounts, or invoice balances.
- Validate all inputs at boundaries.
- Do not expose raw database errors in UI.
- Do not fake success.
- Do not use broad catch blocks that swallow errors and return success.
- Do not put secrets in client code, logs, commits, Docker images, screenshots, or docs.
- Do not provide offensive exploit steps.
- Do not claim security, production readiness, tax compliance, ZATCA/FATOORA compliance, or AI safety that is not implemented.
- Real data requires production security readiness.

## Quality Bar

- Be concrete and project-specific to G7 BLUE CRM.
- Avoid generic cyber advice unless it changes this repository's implementation or review decision.
- Focus on defensive review, secure implementation, and risk reduction.
- Separate blocking issues from optional improvements.
- Do not over-engineer the MVP, but do not compromise sensitive data.
- If the system is not ready for real data, say so clearly.

## Reference-Loading Guidance

Read only the reference files relevant to the mode and touched surface:

- Read [references/auth-rbac.md](references/auth-rbac.md) for Clerk auth, `requirePermission`, roles/permissions, webhook signature verification, unauthorized/forbidden behavior, and role boundaries.
- Read [references/supabase-rls.md](references/supabase-rls.md) for Supabase service_role use, RLS, public tables, anon/publishable key exposure, SQL migrations, RPC grants, SECURITY DEFINER functions, and DEV_ONLY RLS.
- Read [references/financial-security.md](references/financial-security.md) for invoices, payments, quotations, VAT behavior, Company Settings, snapshots, and financial totals.
- Read [references/production-readiness.md](references/production-readiness.md) for deployment, real-data readiness, secrets, webhooks, headers, rate limits, logs, audit, backups, dependency audit, and build status.
- Read [references/ai-llm-security.md](references/ai-llm-security.md) before any AI/LLM feature.

For any SQL or migration work, also use the repo-local migration guard when available and do not create or apply SQL unless explicitly approved. For any business workflow or VAT/ZATCA behavior, also use `$g7-crm-erp-guard`.
