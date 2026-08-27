---
name: g7-nextjs-framework-engineering
description: Choose safe Next.js 16.3.3 App Router mechanisms for G7 when framework-specific behavior materially matters; not for ordinary React or TSX edits.
---

# G7 Next.js Framework Engineering

Use this routed domain skill when the task materially depends on Next.js mechanics:
App Router boundaries, Server or Client Components, Server Functions/Actions, Route
Handlers, Proxy, route conventions, streaming, rendering, caching, configuration,
build/type generation, or version-sensitive APIs. Do not route it merely because a
file is `.tsx` or ordinary React/UI code changes.

This skill provides implementation reasoning only. Agent Control retains authority
for scope, Writer/Reviewer lifecycle, Git, database, deployment, production, and
the final Task Verdict.

## Version-matched starting point

- Resolve the installed Next.js version first. G7 currently uses Next.js 16.3.3,
  React 19.2.4, and the App Router.
- Before relying on a version-sensitive behavior, consult the relevant bundled
  guidance under `node_modules/next/dist/docs/`; do not assume canary behavior.
- Preserve current asynchronous request API and route-type conventions when they
  apply. Use `pnpm exec next typegen` when an authorized route typing change needs
  generated-type validation.

## Server and Client boundaries

- Server Components are the default App Router model. Use a Client Component only
  for real client capability: state, events, effects, browser APIs, or a
  client-only library. Client Components are not inherently wrong.
- Keep server-only data and authority on the server. Prefer direct server-side
  data-layer access from a Server Component when the data already resides inside
  the application server boundary.
- Do not add an internal Route Handler hop solely to call the same server-side data
  layer, and do not use `"use server"` as a Server Component marker.

## Mutations, HTTP, and Proxy

- `"use server"` defines a Server Function boundary. Use Server Actions/Functions
  for UI-coupled mutations or server operations, not as a universal read API, RPC
  transport, or service architecture substitute.
- Treat Server Actions and Route Handlers as trust boundaries: validate input and
  preserve G7 authentication, authorization, permission, and business checks
  inside the boundary.
- Use Route Handlers when HTTP is genuinely contractual: external integrations,
  webhooks, health endpoints, APIs, or other HTTP-facing behavior.
- Treat `proxy.ts` as an early interception/protection layer, not final
  authorization. Do not weaken downstream server-side checks because Proxy ran.

## Route and user-experience mechanisms

- Choose layouts, pages, templates, loading states, Suspense/streaming, error
  boundaries, `not-found`, params, and `searchParams` from route semantics and the
  required user experience; do not add them ceremonially.
- Preserve existing route structure and dynamic behavior unless the authorized
  task and version-matched evidence justify a change.
- Navigation and prefetch choices must respect existing request, permission, and
  data-freshness behavior.

## Rendering and caching

- Decide rendering and caching from the installed version, current `next.config.ts`,
  data freshness, identity/auth scope, invalidation semantics, and existing G7
  behavior.
- Do not assume Cache Components are enabled. Do not implicitly enable or migrate
  to Cache Components, Partial Prefetching, Instant Navigations, React Compiler,
  experimental features, or a different rendering/cache architecture.
- Do not remove existing `dynamic = "force-dynamic"` declarations merely because a
  newer framework mechanism exists.
- Preserve fail-closed authorization and mutable financial/audit truth; framework
  convenience must not override ERP authority or invalidation requirements.

## Domain boundaries

`g7-nextjs-performance-engineering` owns problem measurement, attribution,
before/after evidence, and optimization acceptance. This skill owns choosing the
correct Next.js mechanism once framework-specific reasoning is material. Route both
only when both responsibilities are present; do not duplicate performance work.

Do not prescribe PostgreSQL tuning, indexes, RLS, RPC design, schema changes,
migrations, or grants. If evidence attributes correctness or performance to the
database layer, route to the applicable database/Supabase expertise when available.

## Authority and safety

- Preserve G7 authentication, authorization, financial truth, auditability,
  fail-closed behavior, and ERP contracts.
- This skill grants no authority to widen scope, mutate a database, apply a
  migration, deploy, change production, weaken security, stage, commit, push, or
  issue a final Task Verdict.
- An unavailable optional framework tool is not itself a HOLD condition.
