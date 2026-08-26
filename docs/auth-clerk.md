# Clerk Authentication Foundation

## Current contract

G7 BLUE CRM uses Clerk as its authentication and identity authority. Application roles and permissions are resolved separately from Clerk through the server-side `app_users` lookup; UI hiding is never authorization.

## Environment boundary

Runtime configuration is validated in `src/lib/env.ts`. Public Clerk/Supabase configuration may be used by the corresponding browser or server client; `CLERK_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only.

Never commit `.env.local`, print credential values, or expose tokens, signing material, connection strings, or other protected authentication data. This document does not claim that credential-dependent Clerk runtime smoke has been performed.


## Server-side authorization

- Server actions and server queries must call `requireUser`, `requirePermission`, or an equivalent server-side check before protected work.
- Missing authentication, missing `app_users` records, inactive users, permission failures, and auth/database dependency failures remain fail-closed with safe user-facing errors and bounded diagnostics.
- The Supabase service-role client bypasses RLS and must remain server-only.

## Protected routes

`src/proxy.ts` protects dashboard, customer, quotation, invoice, project, supplier, payment, service, settings, admin, and API route patterns. The read-only `/api/health/db` endpoint and Clerk webhook route are explicit exceptions; the webhook performs its own signature verification. Unauthenticated protected-page requests are redirected to `/sign-in`, while protected API failures remain safe and fail-closed.

The legacy `/login` route redirects to `/sign-in` so existing links and bookmarks continue to resolve.
