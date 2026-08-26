# Core Security Foundation

This document records the current authentication, authorization, and audit boundary for G7 BLUE CRM.

## Authentication and application identity

- Clerk is the authentication authority; the application does not use Supabase Auth or `auth.users`.
- `app_users` maps Clerk identities to application roles: `admin`, `manager`, `sales`, `operations`, `accountant`, and `viewer`.
- Application roles and permissions are resolved server-side. Client-side visibility is not authorization.

## Server-side authorization and data access

- Protected server actions and queries use `requireUser`, `requirePermission`, or an equivalent server-side check.
- Missing authentication, missing or inactive `app_users` records, permission failures, and dependency failures remain fail-closed with safe user-facing errors and bounded diagnostics.
- The Supabase service-role client is server-only and bypasses RLS; it is not a browser or client-component data-access path.
- Do not expose or persist secrets, tokens, signing material, connection strings, or raw provider/database error details.

## Audit attribution

- Security-relevant mutations preserve structured audit evidence and actor attribution through the existing `created_by`, `updated_by`, and `audit_logs.user_id` fields where applicable.
- Audit records do not authorize a caller or replace server-side permission checks.

## Deployment boundary

DEV/DEMO schema, RLS, and runtime verification do not certify production deployment, production operations, or production authority.
