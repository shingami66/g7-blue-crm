---
name: g7-supabase-data-engineering
description: Evidence-first Supabase data-access and trust-boundary guidance for materially relevant G7 data engineering; not a workflow, migration, auth, or ERP controller.
---

# G7 Supabase Data Engineering

Use this routed skill when a task materially depends on Supabase-specific data
engineering: browser/server/admin client selection, Data API queries, service-role
or RLS boundaries, typed Database access, `.rpc()` contracts, Supabase-specific
error/data semantics, or a materially relevant Supabase product. Do not route it
merely because React/TypeScript code imports a helper or ultimately persists data.

This is domain guidance only. Agent Control remains the authority for scope,
Writer/Reviewer lifecycle, Git, database mutation, deployment, production, and the
final Task Verdict.

## G7 starting point

- Clerk remains G7's authentication authority. Do not introduce or migrate to
  Supabase Auth merely because Supabase clients or `@supabase/ssr` are present.
- Resolve the actual caller and trust boundary before choosing browser, server, or
  admin access. Follow the current repository factories and generated `Database`
  type boundary rather than inventing a parallel client or type surface.
- Consult authoritative, version-matched Supabase documentation when a
  product/API detail is version-sensitive; do not turn copied vendor reference
  text into a local handbook.

## Client and trust boundaries

- Browser and server clients using publishable credentials do not replace G7
  authentication, authorization, validation, or business checks.
- The service-role/admin client is privileged, server-only access and bypasses RLS.
  Never assume RLS protects an operation performed through it. Keep service-role
  credentials out of Client Components, browser bundles, logs, and user-visible
  errors; preserve the existing `server-only` boundary.
- Before or around a privileged database call, preserve Clerk identity, canonical
  G7 permissions, input validation, business invariants, safe error mapping, and
  fail-closed behavior as the actual operation requires.

## Queries and data contracts

- Shape projections for the consumer contract. Avoid unnecessary payload and
  duplicate reads, but never truncate or weaken authoritative financial,
  permission, audit, or business truth for convenience.
- Let the real contract determine cardinality, ordering, pagination, nullability,
  and count behavior. Do not add ceremonial limits, client-side authority, or
  unstable ordering.
- Keep sensitive/internal and customer-facing data boundaries explicit. A typed
  result or a successful query does not by itself authorize disclosure.

## RPC and generated types

- Treat every `.rpc()` call as a database contract boundary: verify function name,
  arguments, result shape, caller privilege, grants, transaction/invariant
  implications, and failure semantics against the current repository contract.
- Use generated `Database` types where applicable and preserve their nullability
  and table/function shapes. Type generation improves checking; it grants no
  schema-mutation, migration, or production authority.
- Do not silently turn a database error into success, `false`, or an empty result
  when that would hide an unavailable authority decision. Map errors to existing
  safe operational codes and preserve the established distinction between denied,
  unavailable, empty, and failed states.

## Authority boundaries

- Supabase CLI, MCP, client-library, or project capability does not authorize
  migrations, schema changes, RLS/policy changes, grants, `db push`, project
  setting changes, deployment, or production mutation. Those remain governed by
  the existing migration and security workflows and routed skills.
- Query-plan and index decisions remain evidence-based and belong to the existing
  PostgreSQL query/index and performance expertise when materially relevant.
- Next.js mechanism choices remain with `g7-nextjs-framework-engineering`;
  performance diagnosis and proof remain with
  `g7-nextjs-performance-engineering`; ERP, financial truth, and workflow rules
  remain with the applicable G7 domain guards.
- This skill does not authorize staging, commit, push, scope widening, or a final
  verdict, and an unavailable optional Supabase tool is not a HOLD condition.

## Product boundaries

Give guidance about Storage, Realtime, Supabase Auth, Edge Functions, or other
Supabase products only when the actual task materially touches that product. Keep
Clerk, G7 permissions, financial/audit truth, RLS assumptions, and server-only
secrets aligned with the existing application architecture.
