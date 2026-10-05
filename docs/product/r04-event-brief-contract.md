# R04-A — Event Brief Contract and Minimal Implementation Gap Proof

- **Status:** Discovery contract and implementation-gap proposal; R04-A grants no implementation authority.
- **Evidence baseline:** `main` at `64cf29dd903e4ce737f460cad2631e5d9272ef96`.
- **Current gate:** L1-R04 is **IMPLEMENTED / OWNER ACCEPTANCE PENDING**; this document does not close R04 or W11.

This R04-A contract follows the current [Layer 1 Event ERP Decision Register](event-erp-decision-register.md), [Technical Master Plan](g7-layer1-technical-master-plan.md), and [W11 readiness reconciliation](w11-cutover-readiness-proof-contract.md). It records a bounded recommendation from repository evidence. R04-A grants no runtime, schema, migration, environment, deployment, or publication authority.

## R04-B Owner Acceptance and Bounded Implementation Authority

On 5 October 2026, Mozfer explicitly accepted the R04-B first-slice boundary: a Service-authoritative Event Brief using the documented existing-field minimum; ordinary brief edits only through the existing Inquiry and Quoted Service write boundary; lifecycle/readiness remaining separate from ordinary brief edits; and no post-approval correction workflow in this slice. This acceptance keeps R05 through R08 as separate work and does not add requirements, tasks, milestones, issues, resources, supplier obligations/bookings, people/team roles, incidents, evidence, budget authority, commercial authority, billing, cost, or accounting to R04-B.

The separate R04-B task authorizes the bounded Service-detail implementation described by this contract. It does not authorize a new Event entity, persistent Event Brief storage, a schema or migration change, a new permission, a field-level audit claim, quotation-snapshot mutation, budget-surface expansion, or a later-status correction path. The R04-A evidence, including snapshot provenance, fallback, successor, and legacy-compatibility caveats, remains controlling.

L1-R04 is **IMPLEMENTED / OWNER ACCEPTANCE PENDING**. This bounded implementation does not close R04, make W11 ready, or change the W11 **NO-GO** position.

## R04-B Implementation Evidence — 5 October 2026

The Service detail route now renders one localized, responsive Event Brief from the current Service, linked Customer, and lifecycle sources. It consolidates Service number/title, linked Customer context, event name/type/dates/location, description, current status, and lifecycle context without a quotation read or new persistence. The existing Edit control is visible only with `services:write` while the Service status is Inquiry or Quoted; `updateService` and lifecycle authority are unchanged. Estimated Budget and timestamps remain outside the Brief in Operational Details.

Focused Service/detail/action/schema/i18n tests, TypeScript, scoped ESLint, and a production build passed. Controller publication is next; Mozfer's manual English/Arabic/RTL/responsive acceptance remains pending. R01 and R05–R08 remain **OPEN**.

## A. Current R04 Evidence

- Product Truth makes Service the primary Event context; dashboards and reports do not become event authority. It keeps the Event Brief distinct from requirements, tasks, milestones, issues, resources, supplier obligations/bookings, people/team roles, incidents, and evidence. Exact layouts and field defaults remain deferred (Decision Register OPS-01–OPS-06).
- The Technical Master Plan records Service/Event fields and lifecycle as delivered. R04-B adds the bounded Service-detail Event Brief view over those sources; it does not add an Event entity, fields/defaults, or persistence.
- The current Service model stores `service_number`, required `service_title`, `customer_id`, `event_name`, `event_type`, `event_start_date`, `event_end_date`, `event_location`, `description`, `estimated_budget`, `status`, `sales_owner_id`, and audit timestamps/bylines ([schema migration](../../supabase/migrations/20260616110000_services_bookings_erp_1.sql), [Service type](../../src/types/service.ts)).
- Service create/edit forms already capture the event name, type, date range, location, and description. R04-B consolidates those Service-detail values into the Event Brief. Event fields are optional; an end date requires a start date and cannot precede it ([schemas](../../src/lib/services/schemas.ts), [detail page](<../../src/app/(dashboard)/services/[id]/page.tsx>), [edit form](<../../src/app/(dashboard)/services/[id]/edit/EditServiceForm.tsx>)).
- Lifecycle readiness, execution, completion, and close are separate state dimensions with guarded actions and audit events; ordinary Service edits cannot change status ([lifecycle model](../../src/lib/services/lifecycle.ts), [W3 lifecycle migration](../../supabase/migrations/20260901045957_w3_event_lifecycle_compatibility.sql)).

## B. Gap Matrix

| Area | Current evidence | R04 gap / boundary |
|---|---|---|
| Event identity | Service is the operating aggregate, with one Service ID and generated Service number. | No evidence justifies a second Event identity. |
| Basic event context | Name, free-text type, start/end dates, free-text location, and description exist on Service and are consolidated by R04-B into the Service-detail Event Brief. | Existing optional fields do not prove which facts a complete brief must require. |
| Customer context | Service references a Customer; detail queries join current company/contact/customer number. | Read from the linked Customer as current relationship context; do not copy Customer identity into a competing brief record. |
| Lifecycle/readiness | Status and lifecycle dimensions have separate sources/actions. | Display separately and read-only in the brief; do not use prose or a brief field to restate lifecycle state. |
| Quotation document context | New quotation inserts capture event type/dates/location from Service. `eventName` uses nonblank Service `event_name`, falling back to the quotation's own `event` value when Service has no name. A successor reuses its source snapshot when present, including its `snapshotSource` label unchanged; otherwise the trigger builds one with the same fallback. Some preexisting non-approved quotations were backfilled from current Service data, with the same `q.event` fallback for `eventName`, and labeled `legacy_service_compatibility`; approved rows were excluded. Populated snapshots are immutable ([snapshot migration](../../supabase/migrations/20260920110000_w7p0_event_quotation_customer_document_hardening.sql)). | `snapshotSource` describes the snapshot's original build path—trigger creation or compatibility backfill. It does not show when a successor inherited that snapshot, and `service_at_quotation_creation` does not prove every field came from Service: `eventName` may come from quotation `event`. A compatibility backfill is not quotation-time history. No snapshot is current Service truth or a complete Event Brief, and Service edits must not rewrite it. |
| Other Event work | Requirements, tasks, milestones, issues, people/resources, supplier obligations, incidents, and evidence are distinct Product Truth concepts. | Keep their source records and permissions separate; they are not implicit Event Brief fields or delivered by this R04-A. |
| Change history | Ordinary Service descriptive updates stamp `updated_by` and `updated_at`; reviewed create/update paths do not emit field-level before/after audit records. Lifecycle actions do write audit events. | Required Event Brief edit-history and post-quotation correction semantics remain unresolved. |

## C. Authority Model — Selected

**Service-authoritative Event Brief view.** The Event Brief is a named, Service-scoped presentation of current Service facts and links to their authoritative records. It does not create a second Event ID, `event_briefs` row, or independent copy of Customer, lifecycle, quotation, procurement, cost, or accounting truth. This applies OPS-01 and OPS-04 while keeping each linked concept separate.

## D. Minimum Event Brief Contract

The smallest evidence-backed first slice is a view over these existing sources. “Not set” means the stored source value is null/blank; it is not a generated default.

| Fact | Authority and current field | Contract treatment |
|---|---|---|
| Service identity | `services.id`, `service_number`, required `service_title` | Keep the Service number and title as the record identity/context. Never mint a separate Event identity. |
| Customer | `services.customer_id` → current Customer record | Show a source link and current Customer summary. Do not duplicate or snapshot the Customer name/contact in Event Brief storage. |
| Event name/type | `services.event_name`, `event_type` | Show current values; both are optional text. Type is not a controlled taxonomy in the current form/schema. |
| Event dates | `services.event_start_date`, `event_end_date` | Show dates as dates; no time or timezone is stored. Preserve the existing range validation. |
| Location | `services.event_location` | Show the current optional text as entered; no structured address/city semantics are established. |
| Brief narrative | `services.description` | Show as current Service description/notes. The source does not establish that it is a reviewed, complete, or structured Event Brief. |
| Lifecycle/readiness | `services.status` plus the Service lifecycle state source | Show in its own labeled lifecycle area, never editable through the brief’s ordinary field edit. |
| Budget estimate | `services.estimated_budget` | Exclude from the Event Brief minimum. It is not an approved budget, commitment, actual, margin, or accounting value. Its existing detail-page visibility needs a separate permission decision before any surface is broadened. |
| Sales owner | `services.sales_owner_id` | Do not relabel it as Event team/resource assignment; Product Truth treats those as distinct. |

No current source establishes a required agenda, objectives, guest count, run-of-show, venue contact, or structured location. This contract does not assert that any is required or add it to the data model. If Owner evidence requires additional facts, their owner, sensitivity, edit lifecycle, snapshot rule, and correction history must be specified before adding fields.

Where populated, `event_snapshot` is immutable and contains event name/type/dates/location, not the Service description or a full brief. New inserts capture event type/dates/location from Service; `eventName` uses nonblank Service `event_name`, then falls back to the quotation's own `event` value if Service has no name. A successor copies its source snapshot unchanged when present, including the inherited `snapshotSource` label; otherwise it builds a new snapshot with the same fallback. Some preexisting non-approved quotations were backfilled from current Service data, using the existing quotation's `event` value as the `eventName` fallback when needed; these rows are tagged `legacy_service_compatibility`, explicitly not original capture evidence. Approved rows were excluded from the backfill. For snapshots originally built at insert or backfill, `snapshotSource` distinguishes those paths, but it does not record successor reuse; its label alone also does not establish that `eventName` came from Service ([snapshot migration](../../supabase/migrations/20260920110000_w7p0_event_quotation_customer_document_hardening.sql)). A current Service correction does not silently rewrite an existing quotation snapshot.

## E. Permissions / Audit

- Use the existing server-enforced `services:read` and `services:write` checks. Baseline role templates grant Service writes to Admin, Manager, and Sales; Operations, Accountant, and Viewer have Service read. Effective user grants/denials still apply ([role permissions](../../src/lib/auth/role-permissions.ts)).
- Ordinary edit currently allows only Inquiry or Quoted Services and rejects changes to `customer_id`, `service_number`, and `status`. It stamps `updated_by`; the database update trigger advances `updated_at`. Service lifecycle actions use the separate `services:update_status` authorization and guarded RPC path ([Service actions](../../src/lib/services/actions.ts), [Service timestamp trigger](../../supabase/migrations/20260616110000_services_bookings_erp_1.sql)).
- The Service activity reader displays rows from `audit_logs`, while the reviewed create/update paths do not emit field-level before/after records ([Service activity reader](../../src/lib/services/activity-queries.ts), [Service creation RPC](../../supabase/migrations/20260817100000_g8_service_create_replay_safety.sql)). Do not claim field-level history. Any R04 edit slice must either stay within the existing correction policy after Owner acceptance or separately define and test before/after audit and later-status correction behavior.
- Keep supplier costs/bookings, commercial authority, billing, and accounting in their own permission-aware source sections. The current Service page displays `estimated_budget` in operational details; exclude it from a newly labeled Brief unless its sensitivity and role visibility are explicitly resolved.

## F. UI Contract

- Use the existing Service detail route as the contextual surface. Do not add a standalone Event route, dashboard, duplicate event list, or new navigation surface.
- R04-B presents Service identity, current Customer link, event name/type/date/location, description, current status, and lifecycle context in one coherent Event Brief section; former duplicate schedule/customer/notes presentation is removed.
- Keep lifecycle state and links to quotation, procurement/commitment, billing, costing, and activity as separate source-owned sections. Respect each section’s existing authorization and redaction.
- Provide explicit loading, unavailable, denied, error, and unset-value states. Preserve keyboard access and semantic labels. English/Arabic parity, natural RTL layout, bidi-safe Service IDs/dates, and narrow-screen stacking are acceptance requirements, not evidence already passed.
- R04-B reuses the current Service edit path and its server checks only for Inquiry and Quoted Services. A Service field edit does not update a quotation snapshot. Mozfer’s manual EN/AR/RTL/responsive workflow acceptance remains pending.

## G. Implementation Delta

R04-A changed no runtime or database files. R04-B implements the Service-detail presentation refactor over existing fields and sources. No schema migration, RPC, new permission, or new Event entity was introduced.

That presentation alone does not prove the broader R04 gate complete. Mozfer accepted the existing field set as an adequate first Event Brief and the existing byline/timestamp correction record as sufficient for the bounded R04-B first slice on 5 October 2026. New persistent facts, field-level history, and any post-approval correction workflow remain out of scope and require a separate reviewed data contract and explicit authority.

## H. Risks and Open Questions

1. **Brief completeness:** the current source stores sparse, optional fields and one unstructured description. Product Truth does not name any additional required facts; Owner confirmation is needed before adding them.
2. **Correction history:** ordinary descriptive edits have no field-level before/after audit evidence, and Service editing is currently blocked for statuses later than Quoted. The supported later-status correction path is not established here.
3. **Estimate visibility:** the Service detail page displays estimated budget while baseline `services:read` includes read-only roles. This contract excludes the estimate; its sensitivity/visibility needs an explicit decision before moving or expanding that display.
4. **Snapshot boundary:** quotation snapshots preserve only a subset of event values; `eventName` can come from the quotation's `event` field when Service `event_name` is blank. `snapshotSource` records the original snapshot build path, which a successor may inherit unchanged, so it does not reveal successor reuse. Snapshots are not a synchronized brief, and compatibility values must not be described as original quotation-time evidence.

## I. Historical R04-A Recommendation (Superseded)

The 5 October 2026 Owner acceptance and separate R04-B task recorded above supersede the historical pre-implementation prerequisite in this section. The authorized next work was the bounded R04-B Service-detail implementation; R04 then remained **OPEN / OWNER ACCEPTANCE PENDING** for final completion, and W11 remained **NO-GO**.

**R04-B — Owner-gated Service Event Brief implementation.** The historical R04-A recommendation was to obtain Owner acceptance of this Service-authoritative model, the existing-field minimum, and the change-history/correction boundary before authorizing one bounded Service-detail-only slice. The 5 October 2026 R04-B acceptance recorded above superseded that prerequisite and authorized the slice to consolidate the current fields into a non-duplicated Event Brief section, reuse existing server permissions/validation, test snapshot provenance/immutability including quotation-event-name fallback and legacy compatibility behavior, cover empty states, and complete manual EN/AR/RTL/responsive acceptance. Newly required facts, new audit persistence, and later-status correction workflow remained outside that historical recommendation pending separate contract and authority.

This R04-A artifact does not update W11 readiness status, close R04, or authorize W9/W11 implementation.
