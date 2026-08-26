# Supabase Client Integration

This document records the current Supabase client boundaries for G7 BLUE CRM.

## Client boundaries

- `src/lib/supabase/client.ts` creates the browser client with the public Supabase URL and publishable key.
- `src/lib/supabase/server.ts` creates the server client through `@supabase/ssr` and request cookies.
- `src/lib/supabase/admin.ts` is server-only and uses the service-role key for narrowly authorized server operations; it bypasses RLS.
- `src/lib/env.ts` validates the runtime configuration. Credential values, tokens, and connection strings are not documented or logged here.

## Health boundary

`/api/health/db` performs a read-only `number_sequences` dependency check. It returns a small success response when the dependency is healthy and a sanitized failure response otherwise; bounded diagnostics do not expose raw provider errors, credentials, or connection details. This documentation does not claim that a credential-dependent runtime smoke or production readiness has been performed.

## Operational rules

- Keep the service-role client and its key strictly server-side.
- Use the browser/server clients only within their corresponding runtime boundaries.
- Do not commit `.env.local` or expose protected authentication material.
