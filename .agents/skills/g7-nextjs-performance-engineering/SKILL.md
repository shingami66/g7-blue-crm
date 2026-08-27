---
name: g7-nextjs-performance-engineering
description: Evidence-first performance guidance for materially relevant Next.js navigation, loading, payload, rendering, and optimization work in G7 BLUE CRM; not for ordinary React/Next.js edits or as a workflow controller.
---

# G7 Next.js Performance Engineering

Use this skill when a task has a reported page or navigation slowdown, a measurable
performance regression, payload or bundle concern, rendering or hydration concern,
performance-sensitive loading, or a candidate optimization that must be remeasured.
It is routed domain expertise, not a workflow controller. Agent Control remains the
authority for task scope, Writer/Reviewer lifecycle, HOLD semantics, Git, database,
deployment, production, and the final Task Verdict.

## Evidence first

- Establish the user-visible problem and a comparable baseline when practical; do
  not invent a defect from code shape, one sample, or an unmeasured assumption.
- Match evidence to the journey: authenticated repeated browser measurements for
  visible navigation or click-to-useful claims, request/response and payload
  evidence for network claims, server timing when available for server attribution,
  and query-plan/runtime evidence only when database attribution is justified.
- Separate cold and warm behavior when it affects the conclusion, and keep the
  network, data, authentication, viewport, and interaction conditions comparable.
- Identify the responsible layer before choosing a remedy: navigation/network,
  server or RSC work, data access, serialization/payload, bundle/module loading,
  hydration/rendering, or database/query/RPC/RLS. Slow UI alone is not evidence of
  a slow Postgres query.
- Treat PRIMARY, SECONDARY, and OPTIONAL as reasoning categories, not mandatory
  execution modes or a fixed benchmark ceremony.

## Safe reasoning and candidate changes

Look first for materially relevant, evidence-supported structure issues:

- parallelize truly independent reads while preserving real dependencies and
  authorization ordering;
- avoid unbounded results or payloads, duplicate reads, unnecessary client
  boundaries, and heavy secondary work blocking primary readiness;
- narrow projections, DTOs, and presentation data only when the UI does not need
  the omitted fields; preserve authoritative financial, security, permission,
  audit, and business-invariant truth;
- keep customer-facing and internal/sensitive data boundaries explicit.

Caching is not automatic. Before proposing it, resolve the installed Next.js
version and relevant repository behavior, cache model, request/auth scope,
freshness requirement, invalidation path, and whether mutable financial or
authority data is involved. Do not cache mutable financial, permission, or other
authority data merely because it is expensive.

For this repository, resolve the installed Next.js version and consult the relevant
bundled documentation under `node_modules/next/dist/docs/` before relying on
version-sensitive behavior. The current application is Next.js 16.3.3 with the
App Router. This skill does not imply that a separate Framework or Supabase skill
exists or is implemented; route future expertise only if it is separately present
and materially relevant.

Database changes are a separate authority boundary. Escalate database/index/RLS/
RPC/schema work only when query-plan or runtime evidence supports database
attribution; never add an index or alter a query, RPC, RLS policy, or schema solely
because a route feels slow. Preserve the existing migration, security, financial,
and audit controls.

Preserve G7 ERP contracts while optimizing: Service-centered workflow, quotation
and Approved Billing Scope authority, invoice/payment safety, server-side financial
calculation, authorization, audit evidence, and fail-closed behavior. A performance
candidate must not weaken those contracts or widen execution, database, deployment,
or production authority.

## Measure, compare, and conclude

- Use the smallest evidence set that can answer the question; Lighthouse, Core Web
  Vitals, Vercel telemetry, Server-Timing, or database plans are useful only when
  they match the claim, and none is mandatory for every task.
- Remeasure a candidate under comparable conditions, including repeated runs when
  variability could change the result. Retain a candidate only when the measured
  user-visible or server-side result is materially better without a regression in
  correctness, security, financial behavior, or another affected journey.
- Discard neutral, noisy, or worse candidates and say when no material target was
  established. A measured no-change result is a valid engineering conclusion.
- Remove temporary probes, profilers, diagnostic scripts, log markers, and harnesses
  when evidence collection ends unless they have explicit durable engineering value.
  Keep legitimate permanent regression tests when they protect a proven contract.

Report the claim, journey and conditions, evidence, responsible layer, candidate,
comparison, regressions checked, and remaining uncertainty. Do not present local or
DEV/DEMO evidence as production certification, and do not turn optional tooling or
missing nonessential telemetry into a workflow blocker.
