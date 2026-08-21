---
name: g7-postgres-query-index-guidance
description: Recommendation-only guidance for explicitly bounded G7 query-shape, missing-index, partial-index, WHERE/JOIN-index, or supplied query-plan questions. Do not use for database execution, general Postgres administration, RLS, or generic performance work.
---

# G7 Postgres Query/Index Guidance

## Purpose and authority

Provide technical recommendations for a bounded query/index question. This is a project-owned, Supabase-informed specialist; it is not an official Supabase skill, a database executor, a migration authority, a performance router, a security authority, or a Controller.

`AGENTS.md` and `g7-crm-agent-control` remain the primary routing and task-authority controls. A recommendation never authorizes a change and this skill must not issue Controller task verdicts such as `PASS`, `PASS WITH WARN`, `PARTIAL`, `HOLD`, or `FAIL`.

## Use only when the task explicitly establishes

- query shape or a missing-index question;
- an index proposal, including WHERE/JOIN indexing;
- partial-index applicability; or
- interpretation of query-plan evidence already supplied by an authorized task.

Database-related performance evidence may use this skill only after the upstream task has attributed the question to query/index behavior. If that question is not established, return:

`INSUFFICIENT QUERY/INDEX EVIDENCE`

Do not infer that a slow page, Supabase use, a migration, or a generic performance task is a database or index problem.

## Required inputs and read boundary

Use only task-authorized material:

- exact task scope;
- relevant query text;
- relevant migration or source artifact;
- supplied query-plan evidence; and
- known evidence that establishes a query/index question.

Read only task-authorized source, migration, SQL/query, query-plan, and explicitly necessary schema/type artifacts. Do not perform broad repository searches, inspect a running database, retrieve credentials, or inspect protected material.

## Recommendation method

1. State the observed query/index concern and the supplied evidence.
2. Identify the likely query-shape, predicate, join-side, or partial-index consideration without claiming certainty beyond the evidence.
3. Before recommending an index, assess the relevant WHERE/JOIN predicate, selectivity, workload importance, safely knowable equivalent indexes in supplied artifacts, partial-index applicability, and write/storage/maintenance tradeoffs.
4. For supplied plan evidence only, explain concepts such as sequential scans, index scans, filter selectivity, and likely index usefulness. Do not execute `EXPLAIN` or `EXPLAIN ANALYZE`.
5. Report the recommendation, expected benefit class, tradeoffs, confidence, evidence gaps, and the required next authority gate.

Do not present indexes as free performance: consider user-visible latency, query cost, write overhead, storage, maintenance, selectivity, read/write workload, and redundant-index risk.

## Required output boundary

Use these labels where applicable:

- Observed query/index concern
- Evidence
- Likely cause
- Technical recommendation
- Expected benefit class
- Tradeoffs
- Confidence
- Required next authority gate

Every possible database change must end with:

> Technical recommendation only. Database mutation requires the active G7 database/migration authority path.

`g7-crm-migration-review` owns SQL, migration, and database-change safety. It remains required before a proposed database change can proceed.

## Explicit non-triggers and handoffs

Do not own general Postgres administration, generic schema architecture, RLS, connection or pooling tuning, locking, concurrency, deadlocks, transactions, monitoring, observability, production inspection, Supabase administration, credentials, generic migrations, security review, financial logic, billing, RBAC semantics, performance measurement, Next.js/RSC/browser/network diagnosis, deployment, or CI/CD.

- For RLS, authorization, sensitive data, privileged access, or secrets: defer to `g7-security-hardening-guard` and the active authority chain.
- For billing, invoices, quotations, payments, VAT, financial totals, or RBAC semantics: preserve `g7-crm-erp-guard` and project business truth; discuss only physical query/index implications.
- For any SQL, DDL/DML, index, policy, migration, Supabase CLI, database connection/read, configuration, or production-inspection request: defer to `g7-crm-migration-review` and the active Task Contract.
- For generic performance work: remain inactive until authorized measurement and bottleneck classification identify a query/index question.

Never execute or authorize SQL, DDL, DML, `CREATE INDEX`, `DROP INDEX`, `ALTER TABLE`, policy changes, migrations, database connections, database reads, `EXPLAIN`, `EXPLAIN ANALYZE`, Supabase CLI actions, configuration changes, deployment, commit, or push.

## Provenance and updates

Project-owned / Supabase-informed. Adapted principles are based only on:

- upstream: `supabase/agent-skills`
- pinned commit: `8331f910845103c08d51f6ca1d86ebb7d1f745e3`
- upstream version: `1.1.1`
- license: MIT
- reviewed files:
  - `skills/supabase-postgres-best-practices/SKILL.md`
  - `skills/supabase-postgres-best-practices/references/query-missing-indexes.md`
  - `skills/supabase-postgres-best-practices/references/query-partial-indexes.md`
  - `skills/supabase-postgres-best-practices/references/_sections.md`

Copyright (c) 2026 Supabase. Retain the MIT copyright and permission notice in copies or substantial portions of adapted upstream material.

Never track mutable upstream `main`, `HEAD`, or latest content. Do not auto-update. Any upstream update requires a new bounded review of source and manifest diffs, security, authority and routing collisions, compatibility, license, and scope impact before adoption.
