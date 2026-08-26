---
name: g7-erp-design-guard
description: Project-specific design reasoning guard for G7 BLUE ERP. Preserves product authority, visual identity, ERP density, accessibility, RTL/LTR, responsive behavior, permissions, financial sensitivity, evidence requirements, and design-tool safety; Agent Control owns execution workflow.
---

# G7 ERP Design Guard

This guard is the project-specific context and safety wrapper for `impeccable`, Google Stitch, browser-based design review, screenshot review, AI-generated UI proposals, and future manual frontend design work. It does not replace generic design tools. It constrains them for G7 BLUE.

**Status: APPROVED.**
- **Approved by:** Mozfer Mohamed Elhadi
- **Approval date:** 2026-08-02
- **Effective authority:** Approved G7-specific design-governance wrapper when committed to the repository `main` branch.

Route this guard when visual, interaction, accessibility, RTL/LTR, responsive, permission-presentation, or design-tool concerns materially apply. It does not independently authorize a task. A clear bounded task under Agent Control may include directly affected components, styles, callers, and tests; exact-file scope is required only when the task prescribes it or material risk makes a broader boundary unsafe. `impeccable`, Stitch, browser editing, and Git actions retain their explicit task authority requirements. The guard remains subordinate to `AGENTS.md`, canonical documentation, verified implementation, and `g7-crm-erp-guard`; it does not activate redesign or Event ERP implementation.

Follow `AGENTS.md` and Agent Control for execution, authority, review lifecycle, HOLD semantics, publication, and reporting. Defer ERP safety, business rules, financial rules, workflow rules, and data-model truth to `g7-crm-erp-guard`. This guard owns visual design, interaction design, accessibility, RTL/LTR, responsive behavior, permission presentation, design evidence, and design-tool safety only.

## Contract and Authority

The canonical contract is [`docs/design/G7-ERP-DESIGN-CONTRACT.md`](../../../docs/design/G7-ERP-DESIGN-CONTRACT.md). It is **APPROVED** and effective as a canonical design-governance source when committed to the repository `main` branch; it remains subordinate to the authority hierarchy and is not blanket implementation approval.

Use this authority hierarchy, from highest to lowest:

1. Owner-approved product decisions.
2. Canonical repository documentation.
3. Repository governance and execution guards.
4. Business, security, accounting, permission, and workflow rules.
5. Verified current implementation.
6. The G7 ERP Design Contract.
7. This G7 design guard.
8. Generic design skills such as `impeccable`.
9. Generated design proposals.

Product rules come from canonical product documentation. Security and permissions come from verified repository rules. Accounting and tax behavior cannot be invented. UI hiding is not authorization. Service authority, customer/supplier finance separation, original evidence, and current implementation reality must be preserved. Implementation requires clear task authority within the approved product and safety boundary.

## Optional Design Descriptors

These descriptors may clarify the task, but are not required for ordinary
bounded work and do not replace the base protocol in
`g7-crm-agent-control`.

1. **AUDIT**
2. **PROPOSAL**
3. **IMPLEMENTATION**
4. **REVIEW**

When no descriptor is supplied, follow the explicit task scope and record any
material design uncertainty; do not create a HOLD solely for a missing label.

### AUDIT

Allowed: inspect files, supplied screenshots, verified browser evidence, current components and tokens; produce findings, severity, and unknowns.

Forbidden: edit files, generate implementation, create assets, invoke Stitch, invoke image generation, stage, commit, or push.

### PROPOSAL

Allowed only with explicit approval: propose layouts and information hierarchy, provide text-based wireframe descriptions and bounded visual directions, and invoke `impeccable` in a non-writing or proposal-constrained manner where technically possible. Use Stitch only when separately authorized.

Forbidden: runtime file edits, schema/API/workflow invention, final implementation claims, and Git operations.

### IMPLEMENTATION

Allowed for a clear bounded task after inspecting the applicable product requirements, permission context, language direction, responsive behavior, acceptance criteria, and manual-smoke ownership. Apply only the concerns material to the affected surface. Routes and exact-file allowlists are required only when the task specifies them or material risk makes the broader boundary unsafe.

Still forbidden: broad redesign, unrelated component replacement, schema/API changes, business workflow invention, accounting or permission-policy decisions, automatic commit/push, and unapproved dependencies.

### REVIEW

Allowed: review an existing proposal or implementation against this Contract, product decisions, screenshots, and acceptance criteria; return findings using the repository verdict contract.

Forbidden: silently fixing implementation, expanding scope, committing, or pushing.

## Relevant Design Context

For a material design task, inspect the current evidence needed for the affected surface: its product authority and non-goals; established components and patterns; language/direction; responsive and accessibility needs; permissions and sensitive-data treatment; and relevant loading, empty, error, or unauthorized states. Use screenshots or browser evidence only for claims that need them. A task may provide an approved proposal, explicit design decision, or current implementation evidence; do not require a separate proposal when the bounded task already supplies sufficient authority and acceptance criteria.

Missing context is `UNKNOWN - MUST VERIFY`. Return `HOLD` only when the missing context makes the authorized task unsafe, misleading, or unable to proceed without an unauthorized mutation. Inherited unrelated dirty work is not a HOLD; it becomes one only when it overlaps the authorized scope and cannot be safely isolated. Manual owner acceptance remains human-owned and is required only when the active task requires that acceptance or claims it.

## Generic Tool Boundaries

`impeccable` remains subordinate to repository authority and this Contract. Verify the exact installed skill name and version before invocation; do not assume command names remain stable across versions.

High-risk operations require separate approval, narrow scope, explicit output type, explicit non-goals, explicit file-write authority, and repository-governance permission:

- `craft`, `bolder`, and `overdrive`;
- `extract`, `init`, and `document`;
- `hooks`;
- `live` or manual browser editing;
- `pin` and `unpin`, which may write shortcuts, metadata, configuration, or related harness-directory files;
- asset production or image generation.

Default approved uses, when the task authorizes the tool, are critique, audit, polish recommendations, accessibility review, layout review, responsive review, token consistency review, and incremental proposal work. No generic tool may make accounting, tax, permission, schema, API, route, workflow, or security decisions.

`pin` and `unpin` may write shortcuts, metadata, configuration, or related files into harness directories. They MUST NOT be used in AUDIT mode. They MUST NOT be used in REVIEW mode. They may be considered only in separately approved write-capable work when the exact installed `impeccable` version is verified, exact harness or target scope is identified, explicit write authorization is present, repository governance permits the operation, expected files and side effects are documented, and non-goals are explicit. They must never run automatically. Their command names and behavior are version-dependent and must be re-verified before any future invocation. These are governance requirements and stop conditions, not a claim that the guard technically prevents the commands from running.

## Google Stitch Boundary

Stitch may be used only with separate approval for pre-code exploration, layout alternatives, information hierarchy, or controlled responsive prototypes. It must not determine business workflows, permissions, security, accounting, VAT/ZATCA, schemas, APIs, routes, final components, or production code. Generated output remains a proposal until manual approval.

## Reporting

Use the task's requested report contract and Agent Control's verdict vocabulary. Report the material design evidence, applicable checks, unknowns, validation, and non-mutation or exact-change confirmation needed to support the claim; do not impose a fixed output template or mode-specific checklist on ordinary bounded work. Never claim manual owner acceptance, runtime browser evidence, production readiness, security compliance, or financial correctness without the required evidence.

## Severity

Use exactly these severity labels: `BLOCKER`, `MAJOR`, `MINOR`, and `NOTE`.

## HOLD Conditions

Return `HOLD` when:

- target files are unclear for a write task;
- product requirements are unavailable;
- permission context is unavailable for sensitive pages;
- financial sensitivity is unresolved;
- the request conflicts with canonical product decisions;
- the change requires schema or workflow invention;
- a broad redesign is requested during a bounded feature;
- the exact `impeccable` skill/version cannot be verified before invocation;
- write authority is absent;
- implementation requires a separately approved proposal that is unavailable;
- Stitch is requested without explicit approval;
- runtime evidence is required but unavailable;
- inherited dirty state overlaps the authorized scope and cannot be safely separated;
- allowed file scope cannot be isolated;
- required task-specific design evidence or a materially applicable safety guard is unavailable;
- creating or using the requested capability requires an unapproved registry or existing-guard change.

## Bounded Product-Design Gates

Apply the following gates when their concern materially applies to the affected
surface. They guide evidence and judgment; record the checks needed by the
task and risk rather than imposing a universal ceremony.

### Feature Utility Gate

Before introducing a new navigation, discovery, aggregation, dashboard, or
cross-module surface, record the real user task, user role, information sought,
the existing contextual path, its step count, the proposed step savings,
whether the user normally knows the destination module, duplication with an
existing detail workspace, and whether the maintenance, query, permission,
and UI cost is justified. Do not implement a feature merely because it is
common elsewhere, technically possible, supported by existing data, or
sophisticated. When the destination is known, prefer module-local search,
contextual navigation, related-record links, and scoped filters.

### Dead-Surface and Dead-Column Gate

Do not display a column, KPI, badge, panel, or filter when no current workflow
creates meaningful data for it, all rows are placeholders, it exists only for
a hypothetical future feature, or the user cannot understand or act on it.
Future database fields may remain hidden until their workflow exists.

### Relationship Context and Duplication Gates

Related records must expose human-readable business context such as the
quotation number, Service number, Service title, and useful customer name;
UUIDs, technical IDs, isolated document numbers, and unrelated-page hops must
not be required to infer a relationship. Do not show the same related-record
collection in multiple sections unless each serves a distinct user task. When
a new workspace supersedes an older table, remove the obsolete duplicate only
when the active task explicitly authorizes that change, while preserving
authoritative links, permissions, and empty/error behavior.

### Sentinel-Date Gate

Never render database sentinel, artificial maximum, minimum, or fallback dates
as real business dates, including `9999-12-31` and `0001-01-01`. Render the
authoritative business timestamp, a localized unknown/not-set state, or no
date. A Service event date must not substitute for an activity timestamp.

### Native-Control Collision Gate

Custom icons, buttons, prefixes, and suffixes must not overlap browser search
clear, password reveal, date-picker, autofill, or validation controls. A custom
clear action must avoid the conflicting native affordance, reserve inline
spacing, support LTR and RTL, have an accessible name, and be checked in the
target browser rendering.

### Mixed-Direction Business-Text Gate

Do not concatenate mixed Arabic and English location fields into one
uncontrolled bidi string. Render semantic fields independently, such as city,
coverage area, and country, with appropriate direction handling. Isolate
business identifiers and monetary values from surrounding text.

### Dashboard Priority and Balance Gates

Decision- and action-requiring content must precede passive history and
education. The default hierarchy is critical KPI and quick actions, Attention
Needed, Operations Focus, live workflow state, recent history, and passive
reference. Paired operational panels must use compact independent heights,
bounded lists, View All links when relevant, explicit empty states, balanced
columns, no oversized fixed or minimum heights, and an explicit mobile
stacking order; do not create large empty voids to equalize unrelated panels.
This is a review rubric, not acceptance or activation of Dashboard Priority
Work or any dashboard redesign.

### State, Motion, and Loading Gate

Evaluate each affected state × surface across ready, loading, empty, error,
and unauthorized states, including desktop/mobile and EN/AR/RTL behavior.
Fast search, filter, pagination, and page-size interactions remain
silent-first: retain existing rows and controls, avoid blocking overlays and
decorative global lightning/progress rails, and show localized inline or
pending feedback only when needed. Destination-shaped loading, skeleton
surfaces, and motion must respect reduced-motion preferences and never imply
product activation or owner acceptance. Ordinary in-scope state work does not
need a separate approval merely because this guard identifies the concern.

### Owner-Acceptance Gate

Automated rendering, DOM checks, and screenshots are preparation evidence only.
When a result addresses manual acceptance, separate automated implementation
verification, manual owner testing, and final owner visual acceptance. Mozfer
alone owns manual browser, visual, RTL/mobile, and workflow acceptance; an
agent must never label owner acceptance as passed.

### Expansion-Reference Gate

When a design task activates or changes an expansion decision, consult the
single canonical Expansion Master and preserve its historical decision context.
Update that document only when the active task explicitly authorizes the
canonical-document edit. This guard does not promote deferred scope, authorize
implementation, or permit a competing expansion reference or reliance on an
older deferred statement.

### Required Design-Gate Record

For a task that materially introduces a new surface, navigation, shared pattern,
or sensitive presentation, record the relevant utility, authority, state,
accessibility, direction, responsive, relationship, duplication, collision,
sentinel-value, and manual-acceptance evidence. Do not require unrelated gate
records for ordinary bounded maintenance.

## G7 ERP Constraints

- G7 uses the established deep-navy and restrained-gold identity; do not introduce a separate module identity, decorative gradient system, glassmorphism, excessive effects, or oversized decorative cards.
- Operational clarity and ERP information density take priority over visual novelty.
- Existing G7 tokens and components are reused where suitable; consolidation is evidence-based and separately approved.
- Service remains the operational context and mutation authority; Service Detail must not become an uncontrolled monolith.
- Dedicated billing, approval, report, comparison, and evidence workspaces may be linked from Service.
- Customer finance and supplier/internal finance remain conceptually and visually separate.
- Cost, margin, bank, tax, supplier, and other sensitive values require permission-aware treatment.
- Dashboard content derives from role, permission, assignment, responsibility, and sensitivity; no dashboard is hard-coded for an individual user.
- Mobile preserves critical functionality; RTL is layout behavior, not just text alignment.
- Numbers, currency, dates, IDs, and mixed-language strings use bidi-aware handling.
- Realistic design structure is allowed; fake business metrics, workflow, accounting, tax, or product facts are not.

## Git and Mutation Governance

The guard forbids automatic or implied:

- `git add` or broad/wildcard staging;
- commit;
- push;
- amend;
- force push;
- `git checkout`, branch checkout, or branch switching;
- reset;
- restore;
- clean;
- stash;
- rebase.

The guard does not create separate-task ceremony. Implementation, review, commit, and push require the explicit authority stated by the task; one clear bounded task may cover predictable steps when it expressly authorizes them. Directly affected design files may be inspected or changed inside that boundary; exact-file restrictions apply only when prescribed or required by material risk. No design task may switch branches or worktrees automatically.

## Current-Work Continuity

Preserve the following repository state and direction:

- V1 work continues.
- Feature 009 remains inactive.
- Event ERP implementation remains inactive unless explicitly activated.
- ABS Void/Supersede remains preserved as the preferred inactive candidate.
- Design governance does not activate redesign.
- Wednesday discovery answers are not required for generic design governance.
- Supplier-specific future screens still depend on relevant product evidence.

## Output Rule

Every task ends with the literal `EXACT NEXT ACTION`; write `None` when no
action remains. Agent Control governs the task-result vocabulary, execution
rules, and final Task Verdict. Never claim
browser smoke, production readiness, security compliance, financial
correctness, or owner approval without evidence.
