# R05 — Service Event Tasks Contract

## Current state

**RUNTIME IMPLEMENTED / OWNER ACCEPTANCE PENDING.** The exact published Service Event Tasks SQL was applied to DEV project `dpddrqjzqohexixgdqiq` under native migration identity `20261007063746_service_tasks`. The repository filename was reconciled from original authored timestamp `20261006092707` to that identity; SQL content was byte-for-byte unchanged and migration history was not manually repaired or edited. Schema/security reconciliation passed. The R05-C3 runtime provides Service-scoped task reads, bounded server-searchable active-assignee choices, atomic task actions, and responsive EN/AR Service-detail UI against that foundation. No real G7 business-data acceptance journey has occurred. R05 remains OPEN pending separately authorized Owner acceptance. W11 remains NO-GO.

## Root gap and authority

R05 addresses the missing authoritative Service-scoped operational work record: a task linked to a Service, assigned responsibility, current status, optional due date, and auditable changes and completion.

The Service remains the only Event and operational aggregate. Each task belongs to exactly one `services.id` through `service_tasks.service_id`. This contract creates no Event table, second Event identity, Project-to-Service bridge, or project-management authority. The existing `project_tasks` schema and code remain untouched and are not reused.

## Approved Owner decisions

- **D1 — write roles:** `service_tasks:write` is granted to `manager` and `operations`; `admin` receives it through the existing `*` wildcard. It is not granted to `sales`, `accountant`, or `viewer`. Human Owner governance authority is distinct from the CRM `admin` role.
- **D2 — assignee:** A task may be created unassigned. An active `app_users` assignee is required before transition from `open` to `in_progress` or `completed`. Assignment grants no read or write permission. New assignments must target active users. If an assigned user becomes inactive, retain the assignment and history; an authorized writer may reassign it to another active user.
- **D3 — completion:** The only task states are `open`, `in_progress`, and `completed`. Allowed transitions are `open → in_progress`, `open → completed`, and `in_progress → completed`. `completed` is terminal and read-only. There is no reopen, cancellation, deletion, or correction transition in this slice.
- **D4 — closed Service:** On a `Completed` or `Cancelled` Service, existing tasks remain readable and every task mutation is rejected, including creation, field edit, reassignment, due-date change, and status transition.
- **D5 — Action Center:** No Action Center Event Task projection is included. A future derived projection requires separate authorization.

## Schema

`public.service_tasks` contains only:

| Column | Contract |
|---|---|
| `id` | UUID primary key, `gen_random_uuid()` default |
| `service_id` | Required FK to `public.services(id)`, `ON DELETE RESTRICT` |
| `title` | Required nonblank text; whitespace is trimmed on create and title edit |
| `description` | Nullable text |
| `assignee_user_id` | Nullable FK to `public.app_users(id)`, `ON DELETE RESTRICT` |
| `status` | Required text, defaults to `open`, constrained to the three task states |
| `due_date` | Nullable date |
| `created_at`, `updated_at` | Required timestamps, default to `now()`; updates use the existing timestamp trigger |
| `created_by`, `updated_by` | Required trusted server-supplied Clerk user ID text |

The only explicit secondary index is a B-tree on `service_id`; the primary-key index is implicit. There are no task number, priority, tag, checklist, dependency, attachment, recurring, completion, deletion, cancellation, milestone, issue, or team/resource fields.

Completion time and actor are recorded by the single persisted `task_completed` audit event, not duplicated as task-row columns.

## Mutation and audit contract

Three narrow database functions perform writes: create a task, update editable task fields, and transition task status. Each locks and validates the parent Service before touching the task; this serializes against Service lifecycle status changes. Missing or soft-deleted Services are rejected. `Completed` and `Cancelled` parent Services reject every mutation. The Service lifecycle itself is never modified.

Field update accepts only `title`, `description`, `assignee_user_id`, and `due_date`. It cannot change task identity, Service linkage, status, or created metadata. Task mutation and audit insert occur in the same database transaction; a no-op field update does not create a false audit event.

The migration reuses `public.audit_logs` and its existing generic actions:

| Operation | `action` | `details.event_type` |
|---|---|---|
| Create | `create` | `task_created` |
| Editable fields | `update` | `task_updated` |
| Start | `status_change` | `task_status_changed` |
| Complete | `status_change` | `task_completed` |

Audit rows use `entity_type = 'service_task'` and the task ID as `entity_id`. Details identify task, parent Service, trusted actor, transaction timestamp, and relevant before/after values. Field updates include only changed fields. Completion creates exactly one completion event, not an additional status event.

## Permission and database security

Task views require `services:read`; task writes require `service_tasks:write`. The migration enables RLS, creates no browser policies, revokes direct table privileges from `PUBLIC`, `anon`, and `authenticated`, and grants only `SELECT`, `INSERT`, and `UPDATE` to `service_role`. RPC execution is revoked from browser roles and granted to `service_role`. Functions use `SECURITY INVOKER`; their database checks enforce task, Service, assignee, and state invariants while the future server actions enforce application permissions.

## Scope firewall

- **R06:** no milestones, schedules, gates, or milestone progress.
- **R07:** no issues, incidents, severity, escalation, or resolution workflow.
- **R08:** no team roster, capacity, availability, shifts, multi-resource assignment, or resource planning. One assignee is only responsible for one task.
- R05-C3 adds only Service-scoped runtime queries, bounded server-searchable active-assignee selection, atomic task actions, and the Service-detail Event Tasks UI. No Action Center projection or `project_tasks` reuse/change is included.

## Database apply and acceptance boundary

**COMPLETED — DEV foundation apply and schema/security reconciliation:** The exact published SQL in `supabase/migrations/20261007063746_service_tasks.sql` was applied to DEV project `dpddrqjzqohexixgdqiq` as `20261007063746_service_tasks`. Its original authored repository timestamp was `20261006092707`; the repository filename was reconciled to the DEV identity after apply. SQL content is byte-for-byte unchanged, schema/security reconciliation passed, and migration history was not manually repaired or edited. No DEMO or PROD apply occurred.

**OWNER ACCEPTANCE PENDING:** The DEV foundation remains applied and verified, and the bounded Service Event Tasks runtime is implemented. No real G7 business-data acceptance journey has occurred. R05 remains OPEN until separately authorized Owner acceptance. W11 remains NO-GO. No database or business-data mutation occurred in the runtime implementation. A separately authorized acceptance journey requires authorization for the named Service, permitted active assignee IDs, and bounded task/audit data creation. The Owner journey is: create a task, verify it after refresh, progress it, edit/reassign it, complete it, inspect task-scoped audit history, and confirm unrelated Service lifecycle and commercial/financial records did not change. Verify unauthorized-role rejection, closed-Service behavior, and EN/AR/RTL/mobile presentation. No such journey has been run.
